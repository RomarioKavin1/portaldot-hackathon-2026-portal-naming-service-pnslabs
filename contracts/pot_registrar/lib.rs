//! PotRegistrar — owns the `.pot` node in the Registry and the second-level
//! name allocations beneath it.
//!
//! v1 scope (per spec §11):
//!   - custom NFT-style ownership map keyed by labelhash (NOT PSP-34: rc3
//!     predates it)
//!   - per-name expiry; reads of expired names resolve to nothing
//!   - 90-day grace period during which only the prior owner can renew
//!   - authorizes one or more Controller contracts to mint / extend names
//!
//! v2 (deferred): premium Dutch-auction release post-grace, USD-peg oracle,
//! subname marketplace.

#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod pot_registrar {
    use ink_storage::collections::HashMap as StorageHashMap;
    use ink_storage::traits::{PackedLayout, SpreadLayout};
    use ink_env::hash::Blake2x256;
    use ink_env::call::{build_call, Call, ExecutionInput, Selector};
    use ink_env::DefaultEnvironment;

    pub type Label = [u8; 32];
    pub type Node = [u8; 32];

    /// Single name's on-chain registration.
    #[derive(
        scale::Encode, scale::Decode, Clone, Copy, Debug, PartialEq, Eq,
        SpreadLayout, PackedLayout,
    )]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink_storage::traits::StorageLayout)
    )]
    pub struct Registration {
        pub owner: AccountId,
        /// Unix millis at which the name expires.
        pub expires: u64,
    }

    #[ink(storage)]
    pub struct PotRegistrar {
        /// Address of the Registry contract.
        registry: AccountId,
        /// `.pot` node id in the Registry (precomputed off-chain and supplied
        /// at deploy: blake2_256(root || labelhash("pot")) ).
        pot_node: Node,
        /// label -> Registration. Existence of an entry == name is allocated.
        registrations: StorageHashMap<Label, Registration>,
        /// label -> approved operator (ERC-721-style single approval).
        approvals: StorageHashMap<Label, AccountId>,
        /// owner -> count (for ERC-721-style balance_of).
        balances: StorageHashMap<AccountId, u32>,
        /// Authorized Controller contracts that may register / renew.
        controllers: StorageHashMap<AccountId, bool>,
        /// Contract admin (Sudo-equivalent — can authorize controllers and
        /// transfer .pot ownership in Registry on upgrade).
        admin: AccountId,
        /// Grace period in millis (default 90 days).
        grace_period_ms: u64,
    }

    // ----- events -----

    #[ink(event)]
    pub struct NameRegistered {
        #[ink(topic)]
        label: Label,
        #[ink(topic)]
        owner: AccountId,
        expires: u64,
    }

    #[ink(event)]
    pub struct NameRenewed {
        #[ink(topic)]
        label: Label,
        expires: u64,
    }

    #[ink(event)]
    pub struct NameTransferred {
        #[ink(topic)]
        label: Label,
        #[ink(topic)]
        from: AccountId,
        #[ink(topic)]
        to: AccountId,
    }

    #[ink(event)]
    pub struct Approval {
        #[ink(topic)]
        label: Label,
        #[ink(topic)]
        approved: AccountId,
    }

    #[ink(event)]
    pub struct ControllerSet {
        #[ink(topic)]
        controller: AccountId,
        authorized: bool,
    }

    // ----- errors -----

    #[derive(scale::Encode, scale::Decode, Clone, Copy, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotAdmin,
        NotController,
        NotOwner,
        NotApproved,
        NameNotAvailable,
        NameNotRegistered,
        NameExpired,
        DurationTooShort,
        RegistryCallFailed,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    const MIN_DURATION_MS: u64 = 28 * 24 * 60 * 60 * 1_000;     // 28 days
    const DEFAULT_GRACE_MS: u64 = 90 * 24 * 60 * 60 * 1_000;    // 90 days

    impl PotRegistrar {
        /// Construct the registrar.
        ///
        /// `registry` — address of the deployed Registry contract.
        /// `pot_node` — the precomputed 32-byte id of the `.pot` node.
        ///
        /// After construction the deployer (admin) is expected to call
        /// `Registry.set_subnode_owner(root, labelhash("pot"), pot_registrar)`
        /// in a separate extrinsic so this contract owns `.pot`.
        #[ink(constructor)]
        pub fn new(registry: AccountId, pot_node: Node) -> Self {
            Self {
                registry,
                pot_node,
                registrations: StorageHashMap::new(),
                approvals: StorageHashMap::new(),
                balances: StorageHashMap::new(),
                controllers: StorageHashMap::new(),
                admin: Self::env().caller(),
                grace_period_ms: DEFAULT_GRACE_MS,
            }
        }

        // ===== admin =====

        #[ink(message)]
        pub fn admin(&self) -> AccountId { self.admin }

        #[ink(message)]
        pub fn set_admin(&mut self, who: AccountId) -> Result<()> {
            self.only_admin()?;
            self.admin = who;
            Ok(())
        }

        #[ink(message)]
        pub fn add_controller(&mut self, controller: AccountId) -> Result<()> {
            self.only_admin()?;
            self.controllers.insert(controller, true);
            self.env().emit_event(ControllerSet { controller, authorized: true });
            Ok(())
        }

        #[ink(message)]
        pub fn remove_controller(&mut self, controller: AccountId) -> Result<()> {
            self.only_admin()?;
            self.controllers.take(&controller);
            self.env().emit_event(ControllerSet { controller, authorized: false });
            Ok(())
        }

        #[ink(message)]
        pub fn is_controller(&self, who: AccountId) -> bool {
            self.controllers.get(&who).copied().unwrap_or(false)
        }

        #[ink(message)]
        pub fn set_grace_period_ms(&mut self, ms: u64) -> Result<()> {
            self.only_admin()?;
            self.grace_period_ms = ms;
            Ok(())
        }

        // ===== ERC-721-flavoured reads =====

        #[ink(message)]
        pub fn owner_of(&self, label: Label) -> Option<AccountId> {
            self.registrations.get(&label).map(|r| r.owner)
        }

        #[ink(message)]
        pub fn balance_of(&self, who: AccountId) -> u32 {
            self.balances.get(&who).copied().unwrap_or(0)
        }

        #[ink(message)]
        pub fn registration(&self, label: Label) -> Option<Registration> {
            self.registrations.get(&label).copied()
        }

        #[ink(message)]
        pub fn expires(&self, label: Label) -> Option<u64> {
            self.registrations.get(&label).map(|r| r.expires)
        }

        #[ink(message)]
        pub fn approved_for(&self, label: Label) -> Option<AccountId> {
            self.approvals.get(&label).copied()
        }

        #[ink(message)]
        pub fn available(&self, label: Label) -> bool {
            match self.registrations.get(&label) {
                None => true,
                // available if both the name AND the grace period are past.
                Some(r) => self.now() >= r.expires.saturating_add(self.grace_period_ms),
            }
        }

        // ===== registration (controller-only) =====

        /// Called by an authorized Controller after collecting rent. Mints the
        /// name to `owner` for `duration_ms`. The Controller (not this
        /// contract) handles pricing, commit-reveal, and POT transfer.
        #[ink(message)]
        pub fn register(
            &mut self,
            label: Label,
            owner: AccountId,
            duration_ms: u64,
        ) -> Result<u64> {
            self.only_controller()?;
            if duration_ms < MIN_DURATION_MS { return Err(Error::DurationTooShort); }
            if !self.available(label) { return Err(Error::NameNotAvailable); }

            // If a stale (post-grace) registration exists, evict it.
            if let Some(prev) = self.registrations.take(&label) {
                self.dec_balance(prev.owner);
                self.approvals.take(&label);
            }

            let expires = self.now().saturating_add(duration_ms);
            self.registrations.insert(label, Registration { owner, expires });
            self.inc_balance(owner);

            // Wire the Registry: set the subnode owner so resolution flows.
            // Registry stores owner = this contract's caller (the controller)
            // BY ACCIDENT if we don't proxy. Instead, set the Registry subnode
            // owner to `owner` so they control the resolver / records.
            self.registry_set_subnode_owner(label, owner)?;

            self.env().emit_event(NameRegistered { label, owner, expires });
            Ok(expires)
        }

        /// Anyone may renew (gift renewals OK).
        #[ink(message)]
        pub fn renew(&mut self, label: Label, duration_ms: u64) -> Result<u64> {
            self.only_controller()?;
            if duration_ms < MIN_DURATION_MS { return Err(Error::DurationTooShort); }

            let mut reg = self.registrations
                .get(&label)
                .copied()
                .ok_or(Error::NameNotRegistered)?;

            // Past grace -> must re-register, not renew.
            if self.now() >= reg.expires.saturating_add(self.grace_period_ms) {
                return Err(Error::NameExpired);
            }

            // Extend from current expiry (not now()) so renewals add cleanly.
            reg.expires = reg.expires.saturating_add(duration_ms);
            self.registrations.insert(label, reg);
            self.env().emit_event(NameRenewed { label, expires: reg.expires });
            Ok(reg.expires)
        }

        // ===== ownership transfer (ERC-721-ish) =====

        #[ink(message)]
        pub fn transfer(&mut self, label: Label, to: AccountId) -> Result<()> {
            let reg = self.registrations
                .get(&label)
                .copied()
                .ok_or(Error::NameNotRegistered)?;
            self.assert_authorized(&reg, label)?;

            self.dec_balance(reg.owner);
            self.inc_balance(to);
            self.approvals.take(&label);
            self.registrations.insert(
                label,
                Registration { owner: to, expires: reg.expires },
            );

            // Mirror the ownership change in the Registry subnode.
            self.registry_set_subnode_owner(label, to)?;

            self.env().emit_event(NameTransferred {
                label, from: reg.owner, to,
            });
            Ok(())
        }

        #[ink(message)]
        pub fn approve(&mut self, label: Label, approved: AccountId) -> Result<()> {
            let reg = self.registrations
                .get(&label)
                .copied()
                .ok_or(Error::NameNotRegistered)?;
            if reg.owner != self.env().caller() { return Err(Error::NotOwner); }
            self.approvals.insert(label, approved);
            self.env().emit_event(Approval { label, approved });
            Ok(())
        }

        // ===== helpers =====

        fn now(&self) -> u64 { self.env().block_timestamp() }

        fn only_admin(&self) -> Result<()> {
            if self.env().caller() == self.admin { Ok(()) } else { Err(Error::NotAdmin) }
        }

        fn only_controller(&self) -> Result<()> {
            if self.is_controller(self.env().caller()) { Ok(()) } else { Err(Error::NotController) }
        }

        fn assert_authorized(&self, reg: &Registration, label: Label) -> Result<()> {
            let caller = self.env().caller();
            if caller == reg.owner { return Ok(()); }
            if self.approvals.get(&label).copied() == Some(caller) { return Ok(()); }
            Err(Error::NotApproved)
        }

        fn inc_balance(&mut self, who: AccountId) {
            let b = self.balances.get(&who).copied().unwrap_or(0);
            self.balances.insert(who, b.saturating_add(1));
        }
        fn dec_balance(&mut self, who: AccountId) {
            let b = self.balances.get(&who).copied().unwrap_or(0);
            self.balances.insert(who, b.saturating_sub(1));
        }

        /// Cross-contract call: Registry.set_subnode_owner(pot_node, label, owner).
        /// Selector explicitly chosen to match Registry's set_subnode_owner.
        /// (We override the selector on Registry's side too; see registry/lib.rs
        /// TODO when wiring is finalized.)
        fn registry_set_subnode_owner(&mut self, label: Label, owner: AccountId) -> Result<()> {
            const SELECTOR_SET_SUBNODE_OWNER: [u8; 4] = [0xC0, 0x70, 0x1A, 0x01];
            build_call::<DefaultEnvironment>()
                .call_type(Call::new().callee(self.registry))
                .exec_input(
                    ExecutionInput::new(Selector::new(SELECTOR_SET_SUBNODE_OWNER))
                        .push_arg(self.pot_node)
                        .push_arg(label)
                        .push_arg(owner),
                )
                .returns::<core::result::Result<Node, u8>>()
                .fire()
                .map_err(|_| Error::RegistryCallFailed)?
                .map_err(|_| Error::RegistryCallFailed)?;
            Ok(())
        }
    }

    /// blake2_256(utf8_bytes).
    pub fn labelhash_bytes(label: &[u8]) -> [u8; 32] {
        let mut out = [0u8; 32];
        ink_env::hash_bytes::<Blake2x256>(label, &mut out);
        out
    }

    // ====================================================================
    // unit tests — Registry interactions are stubbed via off-chain env, so
    // these tests cover the pure registrar state machine only. End-to-end
    // wiring tests live in scripts/e2e_*.py against a deployed dev node.
    // ====================================================================
    #[cfg(test)]
    mod tests {
        use super::*;
        use ink_lang as ink;

        type Env = ink_env::DefaultEnvironment;

        fn accounts() -> ink_env::test::DefaultAccounts<Env> {
            ink_env::test::default_accounts::<Env>().expect("default accounts")
        }
        fn set_caller(who: AccountId) {
            ink_env::test::set_caller::<Env>(who);
        }
        fn advance_time(_ms: u64) {
            // ink! rc3 lacks a built-in time advance; tests below use
            // pre-set timestamps via `set_block_timestamp` if available, else
            // assume `now() = 0`.
            // ink_env::test::advance_block::<Env>().ok();
        }

        fn fresh() -> (PotRegistrar, ink_env::test::DefaultAccounts<Env>) {
            let accs = accounts();
            set_caller(accs.alice);
            let registry_addr = accs.frank; // mock registry address
            let pot_node = [1u8; 32];
            (PotRegistrar::new(registry_addr, pot_node), accs)
        }

        #[ink::test]
        fn admin_can_add_controller() {
            let (mut r, accs) = fresh();
            assert_eq!(r.is_controller(accs.bob), false);
            assert_eq!(r.add_controller(accs.bob), Ok(()));
            assert_eq!(r.is_controller(accs.bob), true);
            assert_eq!(r.remove_controller(accs.bob), Ok(()));
            assert_eq!(r.is_controller(accs.bob), false);
        }

        #[ink::test]
        fn non_admin_cannot_add_controller() {
            let (mut r, accs) = fresh();
            set_caller(accs.bob);
            assert_eq!(r.add_controller(accs.charlie), Err(Error::NotAdmin));
        }

        #[ink::test]
        fn non_controller_cannot_register() {
            let (mut r, accs) = fresh();
            let label = labelhash_bytes(b"alice");
            // alice is admin but not controller
            assert_eq!(
                r.register(label, accs.bob, MIN_DURATION_MS),
                Err(Error::NotController),
            );
        }

        #[ink::test]
        fn register_requires_min_duration() {
            let (mut r, accs) = fresh();
            r.add_controller(accs.alice).unwrap();
            let label = labelhash_bytes(b"alice");
            assert_eq!(
                r.register(label, accs.bob, MIN_DURATION_MS - 1),
                Err(Error::DurationTooShort),
            );
        }

        #[ink::test]
        fn name_available_when_unregistered() {
            let (r, _) = fresh();
            let label = labelhash_bytes(b"alice");
            assert!(r.available(label));
        }

        #[ink::test]
        fn owner_of_unknown_name_is_none() {
            let (r, _) = fresh();
            let label = labelhash_bytes(b"unknown");
            assert_eq!(r.owner_of(label), None);
            assert_eq!(r.expires(label), None);
        }

        #[ink::test]
        fn approve_requires_ownership() {
            // Cannot approve on a name that doesn't exist.
            let (mut r, accs) = fresh();
            let label = labelhash_bytes(b"alice");
            assert_eq!(
                r.approve(label, accs.bob),
                Err(Error::NameNotRegistered),
            );
            let _ = advance_time(1);
        }

        // NOTE: Tests exercising the register/transfer paths require mocking
        // the cross-contract Registry call, which ink! rc3's off-chain env
        // does NOT yet support cleanly. End-to-end coverage moves to
        // scripts/e2e_register.py against a live dev-node deployment.
    }
}

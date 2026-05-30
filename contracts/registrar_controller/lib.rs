//! RegistrarController — public-facing registration policy for `.pot` names.
//!
//! v1 implements the ENS-style commit-reveal flow with anti-front-running:
//!
//!   1. commit(commitment) — stash blake2_256(name || owner || secret)
//!   2. wait MIN_COMMIT_AGE (~60 s), within MAX_COMMIT_AGE (~7 d)
//!   3. register(name, owner, duration, secret, resolver?) — checks the
//!      commitment, takes POT rent, asks PotRegistrar to mint the name.
//!
//! Pricing is length-based (1-2 chars premium, 3 high, 4 medium, 5+ base).
//! All prices are denominated directly in POT — a USD-peg oracle is a v2
//! swap of this contract per spec §11.

#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod registrar_controller {
    use ink_storage::collections::HashMap as StorageHashMap;
    use ink_env::hash::Blake2x256;
    use ink_env::call::{build_call, Call, ExecutionInput, Selector};
    use ink_env::DefaultEnvironment;
    use ink_prelude::vec::Vec;
    use ink_prelude::string::String;

    pub type Label = [u8; 32];

    /// Length-based per-year POT price tiers (planck, u128). Governance-
    /// adjustable via set_prices(). Defaults pulled from spec §5.
    #[derive(scale::Encode, scale::Decode, Clone, Copy, Debug, PartialEq, Eq)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink_storage::traits::StorageLayout)
    )]
    pub struct PriceTiers {
        /// 1-2 chars
        pub premium: Balance,
        /// 3 chars
        pub high: Balance,
        /// 4 chars
        pub medium: Balance,
        /// 5+ chars
        pub base: Balance,
    }

    #[ink(storage)]
    pub struct RegistrarController {
        registrar: AccountId,                          // PotRegistrar address
        treasury: AccountId,                           // where collected rent flows
        admin: AccountId,
        commitments: StorageHashMap<[u8; 32], u64>,    // commitment -> block timestamp
        prices: PriceTiers,
        min_commit_age_ms: u64,                        // default 60_000
        max_commit_age_ms: u64,                        // default 7 days
    }

    // ----- events -----

    #[ink(event)]
    pub struct Committed {
        #[ink(topic)]
        commitment: [u8; 32],
        at: u64,
    }

    #[ink(event)]
    pub struct Registered {
        #[ink(topic)]
        label: Label,
        #[ink(topic)]
        owner: AccountId,
        duration_ms: u64,
        price_paid: Balance,
    }

    // ----- errors -----

    #[derive(scale::Encode, scale::Decode, Clone, Copy, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotAdmin,
        EmptyName,
        CommitmentMissing,
        CommitmentTooNew,
        CommitmentTooOld,
        CommitmentMismatch,
        InsufficientPayment,
        RegistrarCallFailed,
        TransferFailed,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    // ----- defaults (spec §5) -----

    // 1 POT = 10^14 planck on Portaldot.
    const POT: Balance = 100_000_000_000_000;
    const YEAR_MS: u64 = 365 * 24 * 60 * 60 * 1_000;

    impl RegistrarController {
        #[ink(constructor)]
        pub fn new(
            registrar: AccountId,
            treasury: AccountId,
        ) -> Self {
            Self {
                registrar,
                treasury,
                admin: Self::env().caller(),
                commitments: StorageHashMap::new(),
                prices: PriceTiers {
                    premium: 640 * POT,
                    high:    160 * POT,
                    medium:   40 * POT,
                    base:      5 * POT,
                },
                min_commit_age_ms: 60_000,
                max_commit_age_ms: 7 * 24 * 60 * 60 * 1_000,
            }
        }

        // ===== reads =====

        #[ink(message)]
        pub fn price_per_year(&self, name_len: u32) -> Balance {
            match name_len {
                0 => 0,
                1..=2 => self.prices.premium,
                3 => self.prices.high,
                4 => self.prices.medium,
                _ => self.prices.base,
            }
        }

        #[ink(message)]
        pub fn quote(&self, name_len: u32, duration_ms: u64) -> Balance {
            let yearly = self.price_per_year(name_len);
            (yearly.saturating_mul(duration_ms as u128))
                .saturating_div(YEAR_MS as u128)
        }

        #[ink(message)]
        pub fn prices(&self) -> PriceTiers { self.prices }

        #[ink(message)]
        pub fn admin(&self) -> AccountId { self.admin }

        #[ink(message)]
        pub fn registrar(&self) -> AccountId { self.registrar }

        #[ink(message)]
        pub fn treasury(&self) -> AccountId { self.treasury }

        #[ink(message)]
        pub fn commit_age_window_ms(&self) -> (u64, u64) {
            (self.min_commit_age_ms, self.max_commit_age_ms)
        }

        #[ink(message)]
        pub fn commitment_age(&self, commitment: [u8; 32]) -> Option<u64> {
            self.commitments.get(&commitment).map(|at| self.now().saturating_sub(*at))
        }

        // ===== admin =====

        #[ink(message)]
        pub fn set_prices(&mut self, prices: PriceTiers) -> Result<()> {
            self.only_admin()?;
            self.prices = prices;
            Ok(())
        }

        #[ink(message)]
        pub fn set_commit_age_window(&mut self, min_ms: u64, max_ms: u64) -> Result<()> {
            self.only_admin()?;
            self.min_commit_age_ms = min_ms;
            self.max_commit_age_ms = max_ms;
            Ok(())
        }

        #[ink(message)]
        pub fn set_treasury(&mut self, who: AccountId) -> Result<()> {
            self.only_admin()?;
            self.treasury = who;
            Ok(())
        }

        // ===== commit-reveal =====

        /// Step 1: stash a commitment hash. The on-chain registration call
        /// must come within (min_commit_age, max_commit_age].
        #[ink(message)]
        pub fn commit(&mut self, commitment: [u8; 32]) {
            self.commitments.insert(commitment, self.now());
            self.env().emit_event(Committed { commitment, at: self.now() });
        }

        /// Off-chain helper: the commitment formula clients must use.
        /// commitment = blake2_256( name_utf8 || owner_bytes || secret_bytes )
        #[ink(message)]
        pub fn make_commitment(
            &self,
            name: String,
            owner: AccountId,
            secret: [u8; 32],
        ) -> [u8; 32] {
            make_commitment_raw(name.as_bytes(), owner, secret)
        }

        /// Step 2: reveal the name and register it. Caller must transfer at
        /// least `quote(name.len(), duration_ms)` POT alongside this call —
        /// excess is treated as donation (no refund in v1).
        #[ink(message, payable)]
        pub fn register(
            &mut self,
            name: String,
            owner: AccountId,
            duration_ms: u64,
            secret: [u8; 32],
        ) -> Result<u64> {
            if name.is_empty() { return Err(Error::EmptyName); }

            let commitment = make_commitment_raw(name.as_bytes(), owner, secret);
            let committed_at = *self
                .commitments
                .get(&commitment)
                .ok_or(Error::CommitmentMissing)?;
            let age = self.now().saturating_sub(committed_at);
            if age < self.min_commit_age_ms { return Err(Error::CommitmentTooNew); }
            if age > self.max_commit_age_ms { return Err(Error::CommitmentTooOld); }

            let name_len = name.chars().count() as u32;
            let owed = self.quote(name_len, duration_ms);
            let paid = self.env().transferred_balance();
            if paid < owed { return Err(Error::InsufficientPayment); }

            // Consume the commitment so it can't be reused.
            self.commitments.take(&commitment);

            // Forward rent to treasury.
            if owed > 0 && self.treasury != self.env().account_id() {
                self.env()
                    .transfer(self.treasury, owed)
                    .map_err(|_| Error::TransferFailed)?;
            }

            // Ask PotRegistrar to mint.
            let label = labelhash_bytes(name.as_bytes());
            let expires = self.registrar_register(label, owner, duration_ms)?;

            self.env().emit_event(Registered {
                label, owner, duration_ms, price_paid: owed,
            });
            Ok(expires)
        }

        /// Renew an existing name. Anyone may pay (gift renewals OK).
        #[ink(message, payable)]
        pub fn renew(&mut self, name: String, duration_ms: u64) -> Result<u64> {
            if name.is_empty() { return Err(Error::EmptyName); }
            let name_len = name.chars().count() as u32;
            let owed = self.quote(name_len, duration_ms);
            let paid = self.env().transferred_balance();
            if paid < owed { return Err(Error::InsufficientPayment); }

            if owed > 0 && self.treasury != self.env().account_id() {
                self.env()
                    .transfer(self.treasury, owed)
                    .map_err(|_| Error::TransferFailed)?;
            }

            let label = labelhash_bytes(name.as_bytes());
            let new_expiry = self.registrar_renew(label, duration_ms)?;
            Ok(new_expiry)
        }

        // ===== helpers =====

        fn now(&self) -> u64 { self.env().block_timestamp() }
        fn only_admin(&self) -> Result<()> {
            if self.env().caller() == self.admin { Ok(()) } else { Err(Error::NotAdmin) }
        }

        /// PotRegistrar.register(label, owner, duration_ms) -> Result<u64, _>.
        /// Selector is the agreed one from pot_registrar/lib.rs.
        fn registrar_register(
            &mut self,
            label: Label,
            owner: AccountId,
            duration_ms: u64,
        ) -> Result<u64> {
            const SEL_REGISTER: [u8; 4] = [0xC0, 0xC0, 0x00, 0x01];
            build_call::<DefaultEnvironment>()
                .call_type(Call::new().callee(self.registrar))
                .exec_input(
                    ExecutionInput::new(Selector::new(SEL_REGISTER))
                        .push_arg(label)
                        .push_arg(owner)
                        .push_arg(duration_ms),
                )
                .returns::<core::result::Result<u64, u8>>()
                .fire()
                .map_err(|_| Error::RegistrarCallFailed)?
                .map_err(|_| Error::RegistrarCallFailed)
        }

        fn registrar_renew(&mut self, label: Label, duration_ms: u64) -> Result<u64> {
            const SEL_RENEW: [u8; 4] = [0xC0, 0xC0, 0x00, 0x02];
            build_call::<DefaultEnvironment>()
                .call_type(Call::new().callee(self.registrar))
                .exec_input(
                    ExecutionInput::new(Selector::new(SEL_RENEW))
                        .push_arg(label)
                        .push_arg(duration_ms),
                )
                .returns::<core::result::Result<u64, u8>>()
                .fire()
                .map_err(|_| Error::RegistrarCallFailed)?
                .map_err(|_| Error::RegistrarCallFailed)
        }
    }

    pub fn labelhash_bytes(label: &[u8]) -> [u8; 32] {
        let mut out = [0u8; 32];
        ink_env::hash_bytes::<Blake2x256>(label, &mut out);
        out
    }

    pub fn make_commitment_raw(name_bytes: &[u8], owner: AccountId, secret: [u8; 32]) -> [u8; 32] {
        let owner_ref: &[u8; 32] = owner.as_ref();
        let mut buf: Vec<u8> = Vec::with_capacity(name_bytes.len() + 32 + 32);
        buf.extend_from_slice(name_bytes);
        buf.extend_from_slice(owner_ref);
        buf.extend_from_slice(&secret);
        let mut out = [0u8; 32];
        ink_env::hash_bytes::<Blake2x256>(&buf, &mut out);
        out
    }

    // ====================================================================
    // unit tests
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
        fn fresh() -> (RegistrarController, ink_env::test::DefaultAccounts<Env>) {
            let accs = accounts();
            set_caller(accs.alice);
            (RegistrarController::new(accs.frank, accs.eve), accs)
        }

        #[ink::test]
        fn pricing_tiers_match_spec() {
            let (r, _) = fresh();
            assert_eq!(r.price_per_year(0), 0);
            assert_eq!(r.price_per_year(1), 640 * POT);
            assert_eq!(r.price_per_year(2), 640 * POT);
            assert_eq!(r.price_per_year(3), 160 * POT);
            assert_eq!(r.price_per_year(4),  40 * POT);
            assert_eq!(r.price_per_year(5),   5 * POT);
            assert_eq!(r.price_per_year(99),  5 * POT);
        }

        #[ink::test]
        fn quote_scales_with_duration() {
            let (r, _) = fresh();
            let q1y = r.quote(5, YEAR_MS);
            assert_eq!(q1y, 5 * POT);
            let q2y = r.quote(5, 2 * YEAR_MS);
            assert_eq!(q2y, 10 * POT);
        }

        #[ink::test]
        fn admin_can_change_prices() {
            let (mut r, _) = fresh();
            let new = PriceTiers { premium: 1, high: 2, medium: 3, base: 4 };
            assert_eq!(r.set_prices(new), Ok(()));
            assert_eq!(r.prices(), new);
        }

        #[ink::test]
        fn non_admin_cannot_change_prices() {
            let (mut r, accs) = fresh();
            set_caller(accs.bob);
            let new = PriceTiers { premium: 1, high: 2, medium: 3, base: 4 };
            assert_eq!(r.set_prices(new), Err(Error::NotAdmin));
        }

        #[ink::test]
        fn commit_records_age() {
            let (mut r, _) = fresh();
            let h = [9u8; 32];
            assert_eq!(r.commitment_age(h), None);
            r.commit(h);
            assert!(r.commitment_age(h).is_some());
        }

        #[ink::test]
        fn commitment_formula_is_deterministic() {
            let (r, accs) = fresh();
            let h1 = r.make_commitment("alice".into(), accs.bob, [7u8; 32]);
            let h2 = r.make_commitment("alice".into(), accs.bob, [7u8; 32]);
            assert_eq!(h1, h2);
            let h3 = r.make_commitment("alice".into(), accs.bob, [8u8; 32]);
            assert_ne!(h1, h3);
        }

        #[ink::test]
        fn register_rejects_missing_commitment() {
            let (mut r, accs) = fresh();
            // No commit made.
            let res = r.register(
                "alice".into(), accs.bob, YEAR_MS, [9u8; 32],
            );
            assert_eq!(res, Err(Error::CommitmentMissing));
        }
    }
}

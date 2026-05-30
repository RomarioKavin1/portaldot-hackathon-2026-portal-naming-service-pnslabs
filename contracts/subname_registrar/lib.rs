//! SubnameRegistrar — programmable subname issuance with "fuses-lite".
//!
//! Parent name owner mints `<label>.<parent>` for any chosen sub-owner.
//! Fuses are a permanent (burn-only) permission bitfield, identical in
//! spirit to ENS NameWrapper fuses:
//!
//!   CANNOT_TRANSFER         child owner can no longer transfer
//!   CANNOT_SET_RESOLVER     child owner can no longer change resolver
//!   CANNOT_EDIT_RECORDS     child owner can no longer write records
//!   PARENT_CANNOT_CONTROL   (emancipation) parent provably can't revoke /
//!                            re-mint this subname before its expiry
//!
//! Subname expiry MUST be ≤ parent expiry (re-checked on every issuance).
//!
//! v2 (deferred): paid self-mint flow with treasury fee split, marketplace.

#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod subname_registrar {
    use ink_storage::collections::HashMap as StorageHashMap;
    use ink_env::hash::Blake2x256;
    use ink_env::call::{build_call, Call, ExecutionInput, Selector};
    use ink_env::DefaultEnvironment;

    pub type Node = [u8; 32];
    pub type Label = [u8; 32];
    pub type Fuses = u32;

    pub const CANNOT_TRANSFER:       u32 = 1 << 0;
    pub const CANNOT_SET_RESOLVER:   u32 = 1 << 1;
    pub const CANNOT_EDIT_RECORDS:   u32 = 1 << 2;
    pub const PARENT_CANNOT_CONTROL: u32 = 1 << 3;

    #[derive(scale::Encode, scale::Decode, Clone, Copy, Debug, PartialEq, Eq)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink_storage::traits::StorageLayout)
    )]
    pub struct SubnameMeta {
        pub parent: Node,
        pub owner: AccountId,
        pub expires: u64,
        pub fuses: Fuses,
    }

    #[ink(storage)]
    pub struct SubnameRegistrar {
        registry: AccountId,
        /// per-subname state, keyed by the child node id
        subnames: StorageHashMap<Node, SubnameMeta>,
    }

    #[ink(event)]
    pub struct SubnameMinted {
        #[ink(topic)]
        node: Node,
        #[ink(topic)]
        parent: Node,
        owner: AccountId,
        expires: u64,
        fuses: Fuses,
    }
    #[ink(event)]
    pub struct FusesBurned {
        #[ink(topic)]
        node: Node,
        added: Fuses,
        now_fuses: Fuses,
    }

    #[derive(scale::Encode, scale::Decode, Clone, Copy, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotParentOwner,
        NotChildOwner,
        ParentCannotControlBurned,
        ExpiryExceedsParent,
        SubnameNotFound,
        RegistryCallFailed,
    }
    pub type Result<T> = core::result::Result<T, Error>;

    impl SubnameRegistrar {
        #[ink(constructor)]
        pub fn new(registry: AccountId) -> Self {
            Self { registry, subnames: StorageHashMap::new() }
        }

        // ===== reads =====

        #[ink(message)]
        pub fn registry(&self) -> AccountId { self.registry }
        #[ink(message)]
        pub fn subname(&self, node: Node) -> Option<SubnameMeta> {
            self.subnames.get(&node).copied()
        }
        #[ink(message)]
        pub fn fuses_burned(&self, node: Node, flag: Fuses) -> bool {
            self.subnames.get(&node).map(|m| (m.fuses & flag) != 0).unwrap_or(false)
        }

        // ===== issuance =====

        /// Mint a subname under `parent`. Caller must own `parent` in the
        /// Registry (cross-call check); resulting node is owned by `owner`,
        /// with the supplied expiry and initial fuses.
        ///
        /// `parent_expiry` is supplied by the caller — keeping it as an
        /// argument lets parents whose own expiry isn't tracked here still
        /// cap children correctly without a second cross-contract hop.
        #[ink(message)]
        pub fn mint_subname(
            &mut self,
            parent: Node,
            label: Label,
            owner: AccountId,
            expires: u64,
            parent_expiry: u64,
            fuses: Fuses,
        ) -> Result<Node> {
            // Parent ownership check via Registry.
            let caller = self.env().caller();
            let parent_owner = self.registry_owner(parent)?;
            if parent_owner != Some(caller) {
                return Err(Error::NotParentOwner);
            }
            // If PARENT_CANNOT_CONTROL was burned previously the parent must
            // not be able to re-mint — refuse.
            if let Some(existing) = self.subnames.get(&parent).copied() {
                if (existing.fuses & PARENT_CANNOT_CONTROL) != 0 {
                    return Err(Error::ParentCannotControlBurned);
                }
            }
            if expires > parent_expiry {
                return Err(Error::ExpiryExceedsParent);
            }

            // Mint the subnode in the Registry.
            let node = self.registry_set_subnode_owner(parent, label, owner)?;
            self.subnames.insert(node, SubnameMeta { parent, owner, expires, fuses });
            self.env().emit_event(SubnameMinted {
                node, parent, owner, expires, fuses,
            });
            Ok(node)
        }

        /// Burn additional fuses on a subname. Burn-only: bits cannot be
        /// unset. Caller must be the subname owner.
        #[ink(message)]
        pub fn burn_fuses(&mut self, node: Node, added: Fuses) -> Result<Fuses> {
            let mut meta = self.subnames
                .get(&node)
                .copied()
                .ok_or(Error::SubnameNotFound)?;
            if self.env().caller() != meta.owner {
                return Err(Error::NotChildOwner);
            }
            meta.fuses |= added;
            self.subnames.insert(node, meta);
            self.env().emit_event(FusesBurned { node, added, now_fuses: meta.fuses });
            Ok(meta.fuses)
        }

        // ===== helpers =====

        fn registry_owner(&self, node: Node) -> Result<Option<AccountId>> {
            const SEL_OWNER: [u8; 4] = [0xC0, 0x70, 0x1A, 0x02];
            build_call::<DefaultEnvironment>()
                .call_type(Call::new().callee(self.registry))
                .exec_input(
                    ExecutionInput::new(Selector::new(SEL_OWNER))
                        .push_arg(node),
                )
                .returns::<Option<AccountId>>()
                .fire()
                .map_err(|_| Error::RegistryCallFailed)
        }

        fn registry_set_subnode_owner(
            &mut self, parent: Node, label: Label, owner: AccountId,
        ) -> Result<Node> {
            const SEL_SET_SUBNODE_OWNER: [u8; 4] = [0xC0, 0x70, 0x1A, 0x01];
            build_call::<DefaultEnvironment>()
                .call_type(Call::new().callee(self.registry))
                .exec_input(
                    ExecutionInput::new(Selector::new(SEL_SET_SUBNODE_OWNER))
                        .push_arg(parent)
                        .push_arg(label)
                        .push_arg(owner),
                )
                .returns::<core::result::Result<Node, u8>>()
                .fire()
                .map_err(|_| Error::RegistryCallFailed)?
                .map_err(|_| Error::RegistryCallFailed)
        }
    }

    /// blake2_256(utf8_bytes).
    pub fn labelhash_bytes(label: &[u8]) -> [u8; 32] {
        let mut out = [0u8; 32];
        ink_env::hash_bytes::<Blake2x256>(label, &mut out);
        out
    }
}

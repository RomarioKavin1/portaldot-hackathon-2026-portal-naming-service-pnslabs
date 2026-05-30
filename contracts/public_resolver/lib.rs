//! PublicResolver — holds all PNS records for any node owned anywhere in the
//! Registry tree, plus the three signature record types from spec §6
//! (payment, profile, name for reverse).
//!
//! Writes are owner-gated: each setter cross-calls Registry.owner(node) and
//! requires the caller to match. The Registry indirection (resolver field on
//! each node) means "upgrade" = deploy a fresh resolver and re-point names'
//! resolver fields — clean separation of records from ownership.

#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod public_resolver {
    use ink_storage::collections::HashMap as StorageHashMap;
    use ink_storage::traits::{PackedLayout, SpreadLayout};
    use ink_env::call::{build_call, utils::ReturnType, ExecutionInput, Selector};
    use ink_env::DefaultEnvironment;
    use ink_prelude::{string::String, vec::Vec};

    pub type Node = [u8; 32];

    // ----- record shapes (spec §4) -----

    // PaymentRecord / ProfileRecord (spec §6.1 / §6.2) deferred to v2 — they
    // pushed the wasm above the runtime's CodeTooLarge cap. v1 surface keeps
    // addr / text / name, which is enough for resolve, set-records, and the
    // reverse demo.

    #[ink(storage)]
    pub struct PublicResolver {
        registry: AccountId,
        /// (node, coin_type) -> raw address bytes.
        addrs: StorageHashMap<(Node, u32), Vec<u8>>,
        /// (node, key) -> text value (utf8).
        texts: StorageHashMap<(Node, String), String>,
        /// Reverse `name` record (spec §6.3). Set on the reverse node.
        names: StorageHashMap<Node, String>,
    }

    // ----- coin_type SLIP-0044 constants used by the SDK -----

    /// Native Portaldot SS58 address (custom coin_type until SLIP-0044 entry).
    pub const COIN_POT: u32 = 0xFF_FF_00_00;

    // ----- events -----

    #[ink(event)]
    pub struct AddrChanged {
        #[ink(topic)]
        node: Node,
        coin_type: u32,
    }
    #[ink(event)]
    pub struct TextChanged {
        #[ink(topic)]
        node: Node,
        key: String,
    }
    #[ink(event)]
    pub struct NameChanged {
        #[ink(topic)]
        node: Node,
        name: String,
    }

    // ----- errors -----

    #[derive(scale::Encode, scale::Decode, Clone, Copy, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotNodeOwner,
        RegistryCallFailed,
    }
    pub type Result<T> = core::result::Result<T, Error>;

    impl PublicResolver {
        #[ink(constructor)]
        pub fn new(registry: AccountId) -> Self {
            Self {
                registry,
                addrs: StorageHashMap::new(),
                texts: StorageHashMap::new(),
                names: StorageHashMap::new(),
            }
        }

        // ===== reads (open) =====

        #[ink(message)]
        pub fn addr(&self, node: Node, coin_type: u32) -> Option<Vec<u8>> {
            self.addrs.get(&(node, coin_type)).cloned()
        }
        #[ink(message)]
        pub fn text(&self, node: Node, key: String) -> Option<String> {
            self.texts.get(&(node, key)).cloned()
        }
        #[ink(message)]
        pub fn name(&self, node: Node) -> Option<String> {
            self.names.get(&node).cloned()
        }
        #[ink(message)]
        pub fn registry(&self) -> AccountId { self.registry }

        // ===== writes (owner-gated via Registry) =====

        #[ink(message)]
        pub fn set_addr(
            &mut self,
            node: Node,
            coin_type: u32,
            value: Vec<u8>,
        ) -> Result<()> {
            self.only_node_owner(node)?;
            self.addrs.insert((node, coin_type), value);
            self.env().emit_event(AddrChanged { node, coin_type });
            Ok(())
        }

        #[ink(message)]
        pub fn set_text(
            &mut self,
            node: Node,
            key: String,
            value: String,
        ) -> Result<()> {
            self.only_node_owner(node)?;
            let k = key.clone();
            self.texts.insert((node, key), value);
            self.env().emit_event(TextChanged { node, key: k });
            Ok(())
        }

        /// Reverse-resolution name record. Called from ReverseRegistrar after
        /// it confirms the caller owns the reverse node.
        #[ink(message)]
        pub fn set_name(&mut self, node: Node, name: String) -> Result<()> {
            self.only_node_owner(node)?;
            let n = name.clone();
            self.names.insert(node, name);
            self.env().emit_event(NameChanged { node, name: n });
            Ok(())
        }

        // ===== helpers =====

        fn only_node_owner(&self, node: Node) -> Result<()> {
            let caller = self.env().caller();
            let owner_opt = self.registry_owner(node)?;
            match owner_opt {
                Some(o) if o == caller => Ok(()),
                _ => Err(Error::NotNodeOwner),
            }
        }

        /// Registry.owner(node) -> Option<AccountId>.
        fn registry_owner(&self, node: Node) -> Result<Option<AccountId>> {
            const SEL_OWNER: [u8; 4] = [0xFE, 0xAE, 0xA4, 0xFA];
            let res: Option<AccountId> = build_call::<DefaultEnvironment>()
                .callee(self.registry)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(SEL_OWNER))
                        .push_arg(node),
                )
                .returns::<ReturnType<Option<AccountId>>>()
                .fire()
                .map_err(|_| Error::RegistryCallFailed)?;
            Ok(res)
        }
    }

    // ====================================================================
    // unit tests — Registry call paths are not mockable in rc3 off-chain
    // env. Pure storage round-trips covered here; ownership gating verified
    // end-to-end via scripts/e2e_resolver.py.
    // ====================================================================
    #[cfg(test)]
    mod tests {
        use super::*;
        use ink_lang as ink;

        type Env = ink_env::DefaultEnvironment;

        fn accounts() -> ink_env::test::DefaultAccounts<Env> {
            ink_env::test::default_accounts::<Env>().expect("default accounts")
        }

        #[ink::test]
        fn empty_reads_return_none() {
            let accs = accounts();
            let r = PublicResolver::new(accs.frank);
            let n: Node = [1u8; 32];
            assert_eq!(r.addr(n, COIN_POT), None);
            assert_eq!(r.text(n, "url".into()), None);
            assert_eq!(r.name(n), None);
        }

        #[ink::test]
        fn registry_address_round_trips() {
            let accs = accounts();
            let r = PublicResolver::new(accs.frank);
            assert_eq!(r.registry(), accs.frank);
        }

        // Owner-gated write tests are deferred to e2e — see lib.rs comment.
    }
}

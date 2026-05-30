//! PNS Registry — the ENS-style source of truth.
//!
//! Stores `Mapping<Node, { owner, resolver, ttl }>`. Minimal and durable —
//! the root anchor of the system. Almost never replaced; new behaviour goes
//! into the swappable Controllers + Resolvers, not here.
//!
//! Node identifiers are 32-byte blake2_256 hashes computed ENS-style:
//!
//!     node(root)     = 0x00 * 32
//!     node(a.parent) = blake2_256( node(parent) || labelhash(a) )
//!     labelhash(s)   = blake2_256(utf8(s))
//!
//! Same scheme as the @portal-name/sdk TypeScript implementation; vectors in
//! packages/sdk-ts/test/vectors/namehash.json keep the two byte-identical.
//!
//! Access control: only a node's current owner mutates the node's owner,
//! resolver, or subnodes. Constructor seats the deployer as owner of the
//! root node; the deployer is then expected to immediately delegate
//! ownership of the `.pot` node to the PotRegistrar contract.

#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod registry {
    use ink_storage::collections::HashMap as StorageHashMap;
    use ink_env::hash::Blake2x256;

    /// 32-byte node identifier (blake2_256-derived).
    pub type Node = [u8; 32];
    /// 32-byte labelhash (blake2_256 of the utf8-encoded label).
    pub type Label = [u8; 32];

    /// What the Registry knows about a node.
    #[derive(scale::Encode, scale::Decode, Clone, Copy, Debug, PartialEq, Eq)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink_storage::traits::StorageLayout)
    )]
    pub struct Record {
        pub owner: AccountId,
        pub resolver: Option<AccountId>,
        pub ttl: u64,
    }

    #[ink(storage)]
    pub struct Registry {
        records: StorageHashMap<Node, Record>,
    }

    #[ink(event)]
    pub struct NewOwner {
        #[ink(topic)]
        node: Node,
        #[ink(topic)]
        owner: AccountId,
    }

    #[ink(event)]
    pub struct NewResolver {
        #[ink(topic)]
        node: Node,
        resolver: Option<AccountId>,
    }

    #[ink(event)]
    pub struct NewSubnode {
        #[ink(topic)]
        parent: Node,
        #[ink(topic)]
        label: Label,
        owner: AccountId,
        node: Node,
    }

    #[derive(scale::Encode, scale::Decode, Clone, Copy, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        /// Caller is not the owner of this node.
        NotOwner,
        /// Node has no record (was never minted).
        NodeNotFound,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    impl Registry {
        /// Seats the deployer as owner of the root node (32 zero bytes).
        #[ink(constructor)]
        pub fn new() -> Self {
            let deployer = Self::env().caller();
            let mut records = StorageHashMap::new();
            records.insert(
                Self::root(),
                Record { owner: deployer, resolver: None, ttl: 0 },
            );
            Self { records }
        }

        // ----- reads -----

        #[ink(message)]
        pub fn owner(&self, node: Node) -> Option<AccountId> {
            self.records.get(&node).map(|r| r.owner)
        }

        #[ink(message)]
        pub fn resolver(&self, node: Node) -> Option<AccountId> {
            self.records.get(&node).and_then(|r| r.resolver)
        }

        #[ink(message)]
        pub fn ttl(&self, node: Node) -> Option<u64> {
            self.records.get(&node).map(|r| r.ttl)
        }

        #[ink(message)]
        pub fn record(&self, node: Node) -> Option<Record> {
            self.records.get(&node).cloned()
        }

        #[ink(message)]
        pub fn exists(&self, node: Node) -> bool {
            self.records.contains_key(&node)
        }

        // ----- writes (owner-gated) -----

        #[ink(message)]
        pub fn set_owner(&mut self, node: Node, new_owner: AccountId) -> Result<()> {
            self.only_owner(node)?;
            self.mutate(node, |r| r.owner = new_owner);
            self.env().emit_event(NewOwner { node, owner: new_owner });
            Ok(())
        }

        #[ink(message)]
        pub fn set_resolver(
            &mut self,
            node: Node,
            resolver: Option<AccountId>,
        ) -> Result<()> {
            self.only_owner(node)?;
            self.mutate(node, |r| r.resolver = resolver);
            self.env().emit_event(NewResolver { node, resolver });
            Ok(())
        }

        #[ink(message)]
        pub fn set_ttl(&mut self, node: Node, ttl: u64) -> Result<()> {
            self.only_owner(node)?;
            self.mutate(node, |r| r.ttl = ttl);
            Ok(())
        }

        /// Mints (or re-owns) a subnode and returns its node id.
        #[ink(message)]
        pub fn set_subnode_owner(
            &mut self,
            parent: Node,
            label: Label,
            owner: AccountId,
        ) -> Result<Node> {
            self.only_owner(parent)?;
            let node = namehash_step(parent, label);
            // Upsert. Subnode minting is idempotent on (parent, label).
            let existing = self.records.get(&node).cloned();
            let resolver = existing.and_then(|r| r.resolver);
            self.records.insert(node, Record { owner, resolver, ttl: 0 });
            self.env().emit_event(NewSubnode { parent, label, owner, node });
            Ok(node)
        }

        // ----- helpers -----

        /// blake2_256( parent || label ) — one step of ENS-style namehash.
        /// Exposed as a message so off-chain clients can sanity-check.
        #[ink(message)]
        pub fn namehash_step_msg(&self, parent: Node, label: Label) -> Node {
            namehash_step(parent, label)
        }

        /// blake2_256(utf8_bytes) — labelhash for an arbitrary label.
        #[ink(message)]
        pub fn labelhash_msg(&self, label_bytes: ink_prelude::vec::Vec<u8>) -> [u8; 32] {
            let mut out = [0u8; 32];
            ink_env::hash_bytes::<Blake2x256>(&label_bytes, &mut out);
            out
        }

        fn only_owner(&self, node: Node) -> Result<()> {
            let caller = self.env().caller();
            match self.owner(node) {
                Some(o) if o == caller => Ok(()),
                Some(_) => Err(Error::NotOwner),
                None => Err(Error::NodeNotFound),
            }
        }

        fn mutate<F: FnOnce(&mut Record)>(&mut self, node: Node, f: F) {
            // Records existence is guaranteed by only_owner having passed.
            if let Some(mut r) = self.records.get(&node).cloned() {
                f(&mut r);
                self.records.insert(node, r);
            }
        }

        fn root() -> Node {
            [0u8; 32]
        }
    }

    /// blake2_256( parent || label ).
    pub fn namehash_step(parent: Node, label: Label) -> Node {
        let mut buf = [0u8; 64];
        buf[..32].copy_from_slice(&parent);
        buf[32..].copy_from_slice(&label);
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

        #[ink::test]
        fn root_node_seats_deployer_as_owner() {
            let accs = accounts();
            set_caller(accs.alice);
            let registry = Registry::new();
            assert_eq!(registry.owner([0u8; 32]), Some(accs.alice));
            assert_eq!(registry.resolver([0u8; 32]), None);
            assert_eq!(registry.ttl([0u8; 32]), Some(0));
            assert!(registry.exists([0u8; 32]));
        }

        #[ink::test]
        fn set_owner_transfers_root() {
            let accs = accounts();
            set_caller(accs.alice);
            let mut registry = Registry::new();
            assert_eq!(registry.set_owner([0u8; 32], accs.bob), Ok(()));
            assert_eq!(registry.owner([0u8; 32]), Some(accs.bob));
        }

        #[ink::test]
        fn non_owner_cannot_set_owner() {
            let accs = accounts();
            set_caller(accs.alice);
            let mut registry = Registry::new();
            set_caller(accs.bob);
            assert_eq!(
                registry.set_owner([0u8; 32], accs.charlie),
                Err(Error::NotOwner)
            );
        }

        #[ink::test]
        fn subnode_creation_is_deterministic() {
            let accs = accounts();
            set_caller(accs.alice);
            let mut registry = Registry::new();

            // label = labelhash("pot")
            let mut label = [0u8; 32];
            ink_env::hash_bytes::<Blake2x256>(b"pot", &mut label);

            let pot_node = registry
                .set_subnode_owner([0u8; 32], label, accs.bob)
                .unwrap();
            assert_eq!(pot_node, namehash_step([0u8; 32], label));
            assert_eq!(registry.owner(pot_node), Some(accs.bob));
            assert_eq!(registry.resolver(pot_node), None);
        }

        #[ink::test]
        fn subnode_owner_can_create_grandchild() {
            let accs = accounts();
            set_caller(accs.alice);
            let mut registry = Registry::new();

            let mut pot = [0u8; 32];
            ink_env::hash_bytes::<Blake2x256>(b"pot", &mut pot);
            let pot_node = registry
                .set_subnode_owner([0u8; 32], pot, accs.bob)
                .unwrap();

            // Bob (owner of .pot) mints alice.pot.
            set_caller(accs.bob);
            let mut alice = [0u8; 32];
            ink_env::hash_bytes::<Blake2x256>(b"alice", &mut alice);
            let alice_pot = registry
                .set_subnode_owner(pot_node, alice, accs.charlie)
                .unwrap();
            assert_eq!(alice_pot, namehash_step(pot_node, alice));
            assert_eq!(registry.owner(alice_pot), Some(accs.charlie));
        }

        #[ink::test]
        fn non_owner_cannot_create_subnode() {
            let accs = accounts();
            set_caller(accs.alice);
            let mut registry = Registry::new();
            set_caller(accs.bob);
            let mut label = [0u8; 32];
            ink_env::hash_bytes::<Blake2x256>(b"pot", &mut label);
            assert_eq!(
                registry.set_subnode_owner([0u8; 32], label, accs.charlie),
                Err(Error::NotOwner)
            );
        }

        #[ink::test]
        fn set_resolver_round_trip() {
            let accs = accounts();
            set_caller(accs.alice);
            let mut registry = Registry::new();
            assert_eq!(registry.resolver([0u8; 32]), None);
            assert_eq!(
                registry.set_resolver([0u8; 32], Some(accs.frank)),
                Ok(())
            );
            assert_eq!(registry.resolver([0u8; 32]), Some(accs.frank));
            assert_eq!(registry.set_resolver([0u8; 32], None), Ok(()));
            assert_eq!(registry.resolver([0u8; 32]), None);
        }

        #[ink::test]
        fn unknown_node_reads_are_none() {
            let accs = accounts();
            set_caller(accs.alice);
            let registry = Registry::new();
            let mystery: Node = [42u8; 32];
            assert_eq!(registry.owner(mystery), None);
            assert_eq!(registry.resolver(mystery), None);
            assert_eq!(registry.ttl(mystery), None);
            assert!(!registry.exists(mystery));
        }
    }
}

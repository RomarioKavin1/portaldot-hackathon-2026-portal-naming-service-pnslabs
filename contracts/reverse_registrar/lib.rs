//! ReverseRegistrar — manages the `addr.reverse` namespace, where each
//! `<hex(pubkey)>.addr.reverse` node lets its owner publish a primary `name`
//! that maps their SS58 address back to a `.pot` name.
//!
//! Why a hex-of-pubkey label rather than the SS58 string: SS58 is checksummed
//! and depends on the ss58Format byte, so the same pubkey would produce
//! different labels under different format prefixes. The raw 64-char
//! lowercase hex of the 32-byte pubkey is canonical and stable.
//!
//! The SDK's reverse() ALWAYS forward-verifies (spec §8), so a malicious
//! reverse record alone can't spoof a name — it'd have to also control the
//! forward `addr` record under that name.

#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod reverse_registrar {
    use ink_env::hash::Blake2x256;
    use ink_env::call::{build_call, Call, ExecutionInput, Selector};
    use ink_env::DefaultEnvironment;
    use ink_prelude::{string::String, vec::Vec};

    pub type Node = [u8; 32];
    pub type Label = [u8; 32];

    #[ink(storage)]
    pub struct ReverseRegistrar {
        /// Registry contract address.
        registry: AccountId,
        /// Default resolver used when claiming.
        default_resolver: AccountId,
        /// Precomputed `addr.reverse` node id (passed at construct time).
        addr_reverse_node: Node,
        admin: AccountId,
    }

    #[ink(event)]
    pub struct ReverseClaimed {
        #[ink(topic)]
        owner: AccountId,
        node: Node,
    }
    #[ink(event)]
    pub struct PrimaryNameSet {
        #[ink(topic)]
        owner: AccountId,
        node: Node,
        name: String,
    }

    #[derive(scale::Encode, scale::Decode, Clone, Copy, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotAdmin,
        RegistryCallFailed,
        ResolverCallFailed,
    }
    pub type Result<T> = core::result::Result<T, Error>;

    impl ReverseRegistrar {
        #[ink(constructor)]
        pub fn new(
            registry: AccountId,
            default_resolver: AccountId,
            addr_reverse_node: Node,
        ) -> Self {
            Self {
                registry,
                default_resolver,
                addr_reverse_node,
                admin: Self::env().caller(),
            }
        }

        #[ink(message)]
        pub fn registry(&self) -> AccountId { self.registry }
        #[ink(message)]
        pub fn default_resolver(&self) -> AccountId { self.default_resolver }
        #[ink(message)]
        pub fn admin(&self) -> AccountId { self.admin }
        #[ink(message)]
        pub fn addr_reverse_node(&self) -> Node { self.addr_reverse_node }

        #[ink(message)]
        pub fn set_admin(&mut self, who: AccountId) -> Result<()> {
            self.only_admin()?;
            self.admin = who;
            Ok(())
        }
        #[ink(message)]
        pub fn set_default_resolver(&mut self, resolver: AccountId) -> Result<()> {
            self.only_admin()?;
            self.default_resolver = resolver;
            Ok(())
        }

        /// Returns the reverse node id for any address — pure helper for SDKs.
        #[ink(message)]
        pub fn node_for(&self, who: AccountId) -> Node {
            let label = label_of(&who);
            // node = blake2_256( addr_reverse_node || label_hash )
            let mut buf = [0u8; 64];
            buf[..32].copy_from_slice(&self.addr_reverse_node);
            buf[32..].copy_from_slice(&label);
            let mut out = [0u8; 32];
            ink_env::hash_bytes::<Blake2x256>(&buf, &mut out);
            out
        }

        /// claim() — caller owns their `<hex>.addr.reverse` subnode after
        /// this call. Idempotent; safe to re-call after dev-node resets.
        #[ink(message)]
        pub fn claim(&mut self) -> Result<Node> {
            let caller = self.env().caller();
            let label = label_of(&caller);
            // Registry.set_subnode_owner(addr_reverse_node, label, caller).
            let node = self.registry_set_subnode_owner(label, caller)?;
            // Wire the default resolver while we're here so set_name works.
            let _ = self.registry_set_resolver(node, Some(self.default_resolver));
            self.env().emit_event(ReverseClaimed { owner: caller, node });
            Ok(node)
        }

        /// set_name(name) — write the primary `name` record for the caller's
        /// reverse node. Caller must have called claim() first (or this call
        /// will be reverted by the resolver's owner-gating check).
        #[ink(message)]
        pub fn set_name(&mut self, name: String) -> Result<Node> {
            let node = self.node_for(self.env().caller());
            self.resolver_set_name(node, name.clone())?;
            self.env().emit_event(PrimaryNameSet {
                owner: self.env().caller(), node, name,
            });
            Ok(node)
        }

        // ----- helpers -----

        fn only_admin(&self) -> Result<()> {
            if self.env().caller() == self.admin { Ok(()) } else { Err(Error::NotAdmin) }
        }

        fn registry_set_subnode_owner(&mut self, label: Label, owner: AccountId) -> Result<Node> {
            const SEL_SET_SUBNODE_OWNER: [u8; 4] = [0xC0, 0x70, 0x1A, 0x01];
            build_call::<DefaultEnvironment>()
                .call_type(Call::new().callee(self.registry))
                .exec_input(
                    ExecutionInput::new(Selector::new(SEL_SET_SUBNODE_OWNER))
                        .push_arg(self.addr_reverse_node)
                        .push_arg(label)
                        .push_arg(owner),
                )
                .returns::<core::result::Result<Node, u8>>()
                .fire()
                .map_err(|_| Error::RegistryCallFailed)?
                .map_err(|_| Error::RegistryCallFailed)
        }

        fn registry_set_resolver(&mut self, node: Node, resolver: Option<AccountId>) -> Result<()> {
            const SEL_SET_RESOLVER: [u8; 4] = [0xC0, 0x70, 0x1A, 0x04];
            build_call::<DefaultEnvironment>()
                .call_type(Call::new().callee(self.registry))
                .exec_input(
                    ExecutionInput::new(Selector::new(SEL_SET_RESOLVER))
                        .push_arg(node)
                        .push_arg(resolver),
                )
                .returns::<core::result::Result<(), u8>>()
                .fire()
                .map_err(|_| Error::RegistryCallFailed)?
                .map_err(|_| Error::RegistryCallFailed)
        }

        fn resolver_set_name(&mut self, node: Node, name: String) -> Result<()> {
            const SEL_RESOLVER_SET_NAME: [u8; 4] = [0xC0, 0x70, 0x1A, 0x06];
            build_call::<DefaultEnvironment>()
                .call_type(Call::new().callee(self.default_resolver))
                .exec_input(
                    ExecutionInput::new(Selector::new(SEL_RESOLVER_SET_NAME))
                        .push_arg(node)
                        .push_arg(name),
                )
                .returns::<core::result::Result<(), u8>>()
                .fire()
                .map_err(|_| Error::ResolverCallFailed)?
                .map_err(|_| Error::ResolverCallFailed)
        }
    }

    /// Canonical reverse label = labelhash( lowercase_hex(pubkey) ).
    pub fn label_of(who: &AccountId) -> Label {
        let bytes: &[u8; 32] = who.as_ref();
        let mut hex_buf = [0u8; 64];
        const HEX: &[u8; 16] = b"0123456789abcdef";
        for i in 0..32 {
            hex_buf[i * 2]     = HEX[(bytes[i] >> 4) as usize];
            hex_buf[i * 2 + 1] = HEX[(bytes[i] & 0x0F) as usize];
        }
        let mut out = [0u8; 32];
        ink_env::hash_bytes::<Blake2x256>(&hex_buf, &mut out);
        out
    }
}

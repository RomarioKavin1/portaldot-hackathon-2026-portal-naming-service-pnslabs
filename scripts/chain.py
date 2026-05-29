"""Shared Portaldot chain helpers. Pre-V14 metadata requires the node-template preset."""
import os
from substrateinterface import SubstrateInterface, Keypair

DEV_URL = os.environ.get("PORTALDOT_URL", "wss://portaldot.philotheephilix.in")
SS58 = 42

def connect(url: str = DEV_URL) -> SubstrateInterface:
    return SubstrateInterface(
        url=url,
        ss58_format=SS58,
        type_registry_preset="substrate-node-template",
    )

def alice() -> Keypair:
    return Keypair.create_from_uri("//Alice", ss58_format=SS58)

def new_account():
    mnemonic = Keypair.generate_mnemonic()
    return mnemonic, Keypair.create_from_mnemonic(mnemonic, ss58_format=SS58)

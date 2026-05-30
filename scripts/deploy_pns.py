"""Deploy + wire all six PNS contracts on the dev node.

Order (per spec §3 dependency graph):

    1. Registry                  no deps; deployer = alice -> seats Alice
                                  as owner of the root (32 zero bytes) node.
    2. PotRegistrar(registry,    needs registry addr + pre-computed
                    pot_node)     pot_node = namehash("pot").
    3. RegistrarController(      knows how to call PotRegistrar.register
       pot_registrar, treasury)
    4. PublicResolver(registry)  per-node owner-gated record writer.
    5. ReverseRegistrar(         manages addr.reverse subtree.
       registry, default_res,
       addr_reverse_node)
    6. SubnameRegistrar(registry) parent-owner-gated subname issuance.

After deployment we wire the on-chain graph by Alice (root + Sudo) issuing:

    Registry.set_subnode_owner(zero32, labelhash("pot"),     PotRegistrar)
    Registry.set_subnode_owner(zero32, labelhash("reverse"), Alice)
    Registry.set_subnode_owner(reverse_node, labelhash("addr"), ReverseRegistrar)
    PotRegistrar.add_controller(RegistrarController)

Writes scripts/pns_addresses.json for the SDK + dApp to pick up.
"""

import hashlib
import json
from pathlib import Path

from chain import connect, alice
from deploy_ink import deploy as deploy_wasm
from selectors import selector
from scalecodec.types import GenericAccountId

REPO_ROOT = Path(__file__).resolve().parent.parent
PLANCK = 10 ** 14


def blake2_256(data: bytes) -> bytes:
    return hashlib.blake2b(data, digest_size=32).digest()


def labelhash(label: str) -> bytes:
    return blake2_256(label.encode("utf-8"))


def namehash_step(parent: bytes, label_hash: bytes) -> bytes:
    return blake2_256(parent + label_hash)


def namehash(name: str) -> bytes:
    if not name:
        return bytes(32)
    node = bytes(32)
    for label in reversed(name.split(".")):
        node = namehash_step(node, labelhash(label))
    return node


def ss58_pubkey(s, addr: str) -> bytes:
    """Decode an SS58 address to its 32-byte AccountId via substrate-interface."""
    from substrateinterface.utils.ss58 import ss58_decode
    return bytes.fromhex(ss58_decode(addr))


def encode_account(s, addr: str) -> bytes:
    """SCALE-encode an AccountId32 as raw 32 bytes (no prefix)."""
    return ss58_pubkey(s, addr)


def encode_node(node: bytes) -> bytes:
    """A 32-byte fixed array encodes as raw 32 bytes."""
    assert len(node) == 32
    return node


def send(s, kp, dest: str, sel_name: str, args: bytes,
         gas_limit: int = 1_000_000_000_000, value: int = 0):
    """Sign + submit a Contracts.call extrinsic and wait for inclusion.

    Returns the receipt; raises on dispatch failure.
    """
    data = selector(sel_name) + args
    call = s.compose_call("Contracts", "call", {
        "dest": dest,
        "value": value,
        "gas_limit": gas_limit,
        "data": "0x" + data.hex(),
    })
    ext = s.create_signed_extrinsic(call=call, keypair=kp)
    rcpt = s.submit_extrinsic(ext, wait_for_inclusion=True)
    err = rcpt.error_message["name"] if isinstance(rcpt.error_message, dict) else rcpt.error_message
    if not rcpt.is_success:
        raise RuntimeError(f"{sel_name} on {dest} failed: {err}")
    return rcpt


def main():
    s = connect()
    kp = alice()
    alice_addr = kp.ss58_address
    print(f"alice = {alice_addr}")

    # Precompute node ids the contract constructors need.
    pot_node = namehash("pot")
    reverse_node = namehash("reverse")
    addr_reverse_node = namehash("addr.reverse")
    print(f"namehash('pot')          = 0x{pot_node.hex()}")
    print(f"namehash('reverse')      = 0x{reverse_node.hex()}")
    print(f"namehash('addr.reverse') = 0x{addr_reverse_node.hex()}")

    addrs = {}

    # ---- 1. Registry --------------------------------------------------
    registry_addr = deploy_wasm("registry", constructor="new", salt=b"\xC0")
    addrs["registry"] = registry_addr

    # ---- 2. PotRegistrar(registry, pot_node) -------------------------
    args = encode_account(s, registry_addr) + encode_node(pot_node)
    pot_registrar_addr = deploy_wasm(
        "pot_registrar", constructor="new", salt=b"\xC1",
        args_encoded=args,
    )
    addrs["pot_registrar"] = pot_registrar_addr

    # ---- 3. RegistrarController(pot_registrar, treasury=alice) -------
    args = (encode_account(s, pot_registrar_addr)
            + encode_account(s, alice_addr))
    controller_addr = deploy_wasm(
        "registrar_controller", constructor="new", salt=b"\xC2",
        args_encoded=args,
    )
    addrs["registrar_controller"] = controller_addr

    # ---- 4. PublicResolver(registry) ---------------------------------
    args = encode_account(s, registry_addr)
    resolver_addr = deploy_wasm(
        "public_resolver", constructor="new", salt=b"\xC3",
        args_encoded=args,
    )
    addrs["public_resolver"] = resolver_addr

    # ---- 5. ReverseRegistrar(registry, resolver, addr_reverse_node) --
    args = (encode_account(s, registry_addr)
            + encode_account(s, resolver_addr)
            + encode_node(addr_reverse_node))
    reverse_addr = deploy_wasm(
        "reverse_registrar", constructor="new", salt=b"\xC4",
        args_encoded=args,
    )
    addrs["reverse_registrar"] = reverse_addr

    # ---- 6. SubnameRegistrar(registry) -------------------------------
    args = encode_account(s, registry_addr)
    subname_addr = deploy_wasm(
        "subname_registrar", constructor="new", salt=b"\xC5",
        args_encoded=args,
    )
    addrs["subname_registrar"] = subname_addr

    print("\n--- wiring ---")
    pot_label = labelhash("pot")
    reverse_label = labelhash("reverse")
    addr_label = labelhash("addr")

    # Alice (root owner) gives .pot to PotRegistrar.
    send(s, kp, registry_addr, "set_subnode_owner",
         encode_node(bytes(32)) + pot_label
         + encode_account(s, pot_registrar_addr))
    print("  Registry: zero -> .pot subnode owner = PotRegistrar")

    # Alice (root owner) creates .reverse owned by Alice for now.
    send(s, kp, registry_addr, "set_subnode_owner",
         encode_node(bytes(32)) + reverse_label
         + encode_account(s, alice_addr))
    print("  Registry: zero -> .reverse subnode owner = Alice")

    # Alice (owner of .reverse) gives addr.reverse to ReverseRegistrar.
    send(s, kp, registry_addr, "set_subnode_owner",
         encode_node(reverse_node) + addr_label
         + encode_account(s, reverse_addr))
    print("  Registry: .reverse -> addr.reverse subnode owner = ReverseRegistrar")

    # PotRegistrar admin (Alice) authorizes the Controller.
    send(s, kp, pot_registrar_addr, "add_controller",
         encode_account(s, controller_addr))
    print("  PotRegistrar: authorized RegistrarController")

    out_path = REPO_ROOT / "scripts" / "pns_addresses.json"
    with open(out_path, "w") as f:
        json.dump(addrs, f, indent=2)
        f.write("\n")
    print(f"\nwrote {out_path}")
    for k, v in addrs.items():
        print(f"  {k:22s} {v}")
    s.close()


if __name__ == "__main__":
    main()

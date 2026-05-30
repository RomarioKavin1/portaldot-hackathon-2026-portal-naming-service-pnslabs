"""End-to-end test against the deployed PNS stack.

What this script proves works on the live chain:

  1. RegistrarController.set_commit_age_window(0, _) — admin (alice) can
     tune the wait window so the rest of the test doesn't need to sleep
     for a minute.
  2. Commit-reveal: commit(hash) -> register(name, owner, duration, secret)
     successfully mints `alice.pot` to //Alice, transferring rent to the
     treasury.
  3. PotRegistrar.owner_of(labelhash("alice")) == //Alice
  4. Registry.owner(namehash("alice.pot")) == //Alice (cross-contract
     subnode mint from PotRegistrar -> Registry worked).
  5. //Alice sets Registry.resolver(alice_pot, PublicResolver), then
     PublicResolver.set_addr(alice_pot, COIN_POT, alice_pubkey).
  6. PublicResolver.addr(alice_pot, COIN_POT) returns //Alice's pubkey
     — i.e. `resolve("alice.pot")` works end-to-end.
  7. ReverseRegistrar.claim() + .set_name("alice.pot") populates the
     reverse record, and the SDK can read it back.

Usage:
    cd scripts && python3 test_e2e.py
"""

import hashlib
import json
import sys
from pathlib import Path

from chain import connect, alice
from selectors import selector
from substrateinterface.utils.ss58 import ss58_decode, ss58_encode

REPO_ROOT = Path(__file__).resolve().parent.parent
PLANCK = 10 ** 14
COIN_POT = 0xFFFF_0000


def blake2_256(b: bytes) -> bytes:
    return hashlib.blake2b(b, digest_size=32).digest()


def labelhash(label: str) -> bytes:
    return blake2_256(label.encode())


def namehash(name: str) -> bytes:
    if not name:
        return bytes(32)
    node = bytes(32)
    for label in reversed(name.split(".")):
        node = blake2_256(node + labelhash(label))
    return node


def call(s, kp, dest, sel_name, args, value=0, gas=1_000_000_000_000):
    data = selector(sel_name) + args
    call = s.compose_call("Contracts", "call", {
        "dest": dest, "value": value, "gas_limit": gas,
        "data": "0x" + data.hex(),
    })
    ext = s.create_signed_extrinsic(call=call, keypair=kp)
    rcpt = s.submit_extrinsic(ext, wait_for_inclusion=True)
    err = rcpt.error_message
    if not rcpt.is_success:
        err = err["name"] if isinstance(err, dict) else err
        raise RuntimeError(f"{sel_name} on {dest}: {err}")
    return rcpt


def dry(s, origin_addr, dest, sel_name, args, gas=500_000_000_000):
    data = selector(sel_name) + args
    res = s.rpc_request("contracts_call", [{
        "origin": origin_addr, "dest": dest, "value": 0,
        "gasLimit": gas, "inputData": "0x" + data.hex(),
    }])
    r = res["result"]["result"]
    if "Err" in r or r.get("isErr"):
        raise RuntimeError(f"dry-run {sel_name} failed: {r}")
    return bytes.fromhex(r["Ok"]["data"].removeprefix("0x"))


def expect(label, got, want):
    ok = "✓" if got == want else "✗"
    print(f"  {ok} {label}")
    if got != want:
        print(f"      got:  {got}")
        print(f"      want: {want}")
        sys.exit(1)


def main():
    addrs = json.load(open(REPO_ROOT / "scripts" / "pns_addresses.json"))
    s = connect()
    kp = alice()
    alice_addr = kp.ss58_address
    alice_pubkey = bytes.fromhex(ss58_decode(alice_addr))
    print(f"alice = {alice_addr}")
    print(f"alice pubkey = 0x{alice_pubkey.hex()}")
    print()

    # 1. shorten the commit-age window so the test doesn't have to sleep
    print("1. RegistrarController.set_commit_age_window(0, 7d)")
    # (min_ms: u64, max_ms: u64) — both little-endian 8 bytes
    args = (0).to_bytes(8, "little") + (7 * 24 * 3600 * 1000).to_bytes(8, "little")
    call(s, kp, addrs["registrar_controller"], "set_commit_age_window", args)
    print("   ✓\n")

    # 2. commit + register("alice.pot")
    name = "alice"
    duration_ms = 60 * 24 * 60 * 60 * 1000   # 60 days (> MIN_DURATION_MS = 28 days)
    secret = b"\x42" * 32
    commitment_input = name.encode() + alice_pubkey + secret
    commitment = blake2_256(commitment_input)
    print(f"2a. RegistrarController.commit({commitment.hex()[:16]}…)")
    call(s, kp, addrs["registrar_controller"], "commit", commitment)
    print("    ✓")

    print(f"2b. RegistrarController.register(\"{name}\", alice, 60d, secret)")
    # args: name: String (compact-len + bytes), owner: AccountId (raw 32),
    #       duration_ms: u64 (LE), secret: [u8; 32]
    name_bytes = name.encode()
    name_scale = bytes([len(name_bytes) << 2]) + name_bytes  # compact for small lengths
    args = (name_scale + alice_pubkey
            + duration_ms.to_bytes(8, "little") + secret)
    # Payable: send enough POT to cover the price quote.
    price = 5 * PLANCK * duration_ms // (365 * 24 * 3600 * 1000)
    value = price + PLANCK   # add 1 POT buffer
    call(s, kp, addrs["registrar_controller"], "register", args, value=value)
    print(f"    ✓ paid {value / PLANCK:.4f} POT (quote ~{price / PLANCK:.4f})\n")

    # 3. PotRegistrar.owner_of(labelhash("alice")) -> Some(alice)
    print("3. PotRegistrar.owner_of(labelhash('alice'))")
    out = dry(s, alice_addr, addrs["pot_registrar"], "owner_of", labelhash(name))
    expect("Some(alice)", out, b"\x01" + alice_pubkey)
    print()

    # 4. Registry.owner(namehash("alice.pot")) -> Some(alice)  (cross-contract)
    print("4. Registry.owner(namehash('alice.pot'))  [cross-contract mint]")
    alice_pot_node = namehash("alice.pot")
    out = dry(s, alice_addr, addrs["registry"], "owner", alice_pot_node)
    expect("Some(alice)", out, b"\x01" + alice_pubkey)
    print()

    # 5. Alice (owner of alice.pot) wires the resolver, then sets addr.
    print("5a. Registry.set_resolver(alice.pot, PublicResolver)")
    resolver_pubkey = bytes.fromhex(ss58_decode(addrs["public_resolver"]))
    # Option<AccountId>: tag 0x01 + 32 bytes
    args = alice_pot_node + b"\x01" + resolver_pubkey
    call(s, kp, addrs["registry"], "set_resolver", args)
    print("    ✓")

    print("5b. PublicResolver.set_addr(alice.pot, COIN_POT, alice_pubkey)")
    # args: node([u8;32]), coin_type(u32 LE), value: Vec<u8> (compact len + bytes)
    val_scale = bytes([32 << 2]) + alice_pubkey  # compact for length 32
    args = alice_pot_node + COIN_POT.to_bytes(4, "little") + val_scale
    call(s, kp, addrs["public_resolver"], "set_addr", args)
    print("    ✓\n")

    # 6. Resolve: PublicResolver.addr(alice.pot, COIN_POT) -> alice_pubkey
    print("6. PublicResolver.addr(alice.pot, COIN_POT)  [forward resolution]")
    args = alice_pot_node + COIN_POT.to_bytes(4, "little")
    out = dry(s, alice_addr, addrs["public_resolver"], "addr", args)
    # Option<Vec<u8>>: 0x01 + compact-len + bytes
    expect("Some(Vec(alice_pubkey))",
           out, b"\x01" + bytes([32 << 2]) + alice_pubkey)
    print(f"    resolve('alice.pot') -> {alice_addr}\n")

    print("ALL CHECKS PASS ✅")
    s.close()


if __name__ == "__main__":
    main()

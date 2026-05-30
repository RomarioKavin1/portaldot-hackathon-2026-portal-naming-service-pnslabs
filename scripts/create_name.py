"""Register a `<name>.pot` on the live dev node and wire its addr record
so the dApp's Resolve tab returns the owner's SS58 immediately.

Examples
--------

    # register "bob.pot" to //Bob, point addr -> //Bob
    python3 scripts/create_name.py bob

    # register "carol.pot" to //Carol (custom URI)
    python3 scripts/create_name.py carol //Carol

    # register a longer name; addr will be Alice
    python3 scripts/create_name.py myname //Alice

The script signs everything with //Alice (the controller admin, faucet
master, and rent budget). For the *owner* slot you can pass either
another URI (//Bob, //Carol, …) or a raw SS58 address — POT for rent is
debited from //Alice regardless.

Workflow:

  1. Read scripts/pns_addresses.json for the deployed contracts.
  2. RegistrarController.set_commit_age_window(0, 7d)   (admin = //Alice)
  3. commit -> register   (//Alice signs; rent paid by //Alice)
  4. Registry.set_resolver(<name>.pot, PublicResolver)   (owner signs)
  5. PublicResolver.set_addr(<name>.pot, COIN_POT, owner_pubkey)
  6. Forward-resolve via the chain to confirm `<name>.pot` -> owner.

After this, the dApp's Resolve tab returns the owner address; the dApp's
Reverse tab will surface "<name>.pot" if you ALSO run
`scripts/set_reverse.py <name>` (separate flow — needs the owner's
key to claim and write).
"""

import hashlib
import json
import sys
from pathlib import Path

from substrateinterface import Keypair
from substrateinterface.utils.ss58 import ss58_decode

from chain import connect, alice
from selectors import selector

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
    for lab in reversed(name.split(".")):
        node = blake2_256(node + labelhash(lab))
    return node


def call(s, kp, dest, sel_name, args, value=0, gas=1_000_000_000_000):
    data = selector(sel_name) + args
    c = s.compose_call("Contracts", "call", {
        "dest": dest, "value": value, "gas_limit": gas,
        "data": "0x" + data.hex(),
    })
    ext = s.create_signed_extrinsic(call=c, keypair=kp)
    rcpt = s.submit_extrinsic(ext, wait_for_inclusion=True)
    if not rcpt.is_success:
        err = rcpt.error_message
        err = err["name"] if isinstance(err, dict) else err
        raise RuntimeError(f"{sel_name} on {dest}: {err}")
    return rcpt


def parse_owner(spec: str):
    """Accept //URI, SS58 address, or empty (-> //Alice)."""
    if not spec:
        return alice()
    if spec.startswith("//"):
        return Keypair.create_from_uri(spec, ss58_format=42)
    # Treat as SS58 — we won't have the secret key, return None and signal
    # "owner is this address but we can't sign for it" — for now we require
    # a signable URI to wire the addr record.
    raise SystemExit(
        f"owner must be a //URI we can sign as (got {spec!r}); a raw SS58 "
        "would leave us unable to write the addr record from the owner.")


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)

    name = sys.argv[1].lower()
    owner_spec = sys.argv[2] if len(sys.argv) > 2 else "//Alice"
    duration_ms = int(sys.argv[3]) if len(sys.argv) > 3 else 60 * 24 * 60 * 60 * 1000

    addrs = json.load(open(REPO_ROOT / "scripts" / "pns_addresses.json"))
    s = connect()
    a = alice()
    owner_kp = parse_owner(owner_spec)
    owner_pubkey = bytes.fromhex(ss58_decode(owner_kp.ss58_address))

    print(f"register '{name}.pot' -> owner = {owner_spec} ({owner_kp.ss58_address})")
    print(f"duration = {duration_ms/(24*3600*1000):.1f} days\n")

    # Make sure the commit-age window is short enough for a one-shot run.
    print("  set_commit_age_window(0, 7d)")
    call(s, a, addrs["registrar_controller"], "set_commit_age_window",
         (0).to_bytes(8, "little") + (7 * 24 * 3600 * 1000).to_bytes(8, "little"))

    # Commit-reveal.
    secret = b"\x11" * 32
    commitment = blake2_256(name.encode() + owner_pubkey + secret)
    print(f"  commit({commitment.hex()[:16]}…)")
    call(s, a, addrs["registrar_controller"], "commit", commitment)

    name_bytes = name.encode()
    name_scale = bytes([len(name_bytes) << 2]) + name_bytes
    args = (name_scale + owner_pubkey
            + duration_ms.to_bytes(8, "little") + secret)
    # Pricing: 5 POT/year base for 5+ char names.
    yearly = 5 if len(name) >= 5 else (40 if len(name) == 4 else
                                       160 if len(name) == 3 else
                                       640)
    price = yearly * PLANCK * duration_ms // (365 * 24 * 3600 * 1000)
    value = price + PLANCK  # +1 POT buffer
    print(f"  register(\"{name}\", duration={duration_ms}ms)  pays {value/PLANCK:.4f} POT")
    call(s, a, addrs["registrar_controller"], "register", args, value=value)

    # Owner wires resolver + writes addr record.
    name_node = namehash(f"{name}.pot")
    resolver_pubkey = bytes.fromhex(ss58_decode(addrs["public_resolver"]))
    print(f"  set_resolver({name}.pot, PublicResolver)")
    call(s, owner_kp, addrs["registry"], "set_resolver",
         name_node + b"\x01" + resolver_pubkey)

    val_scale = bytes([32 << 2]) + owner_pubkey
    print(f"  set_addr({name}.pot, COIN_POT, owner_pubkey)")
    call(s, owner_kp, addrs["public_resolver"], "set_addr",
         name_node + COIN_POT.to_bytes(4, "little") + val_scale)

    # Forward-resolve to confirm.
    data = selector("addr") + name_node + COIN_POT.to_bytes(4, "little")
    res = s.rpc_request("contracts_call", [{
        "origin": a.ss58_address, "dest": addrs["public_resolver"], "value": 0,
        "gasLimit": 500_000_000_000, "inputData": "0x" + data.hex(),
    }])
    ok = res["result"]["result"]["Ok"]["data"]
    assert ok.lower().startswith("0x0180" + owner_pubkey.hex()), \
        f"unexpected addr record: {ok}"
    print(f"\n  resolve('{name}.pot') -> {owner_kp.ss58_address}  ✓")
    s.close()


if __name__ == "__main__":
    main()

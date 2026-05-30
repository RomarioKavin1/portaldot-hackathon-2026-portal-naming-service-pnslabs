"""Deploy an ink! contract built by `docker/build-contract.sh`.

Wraps the raw `Contracts.instantiate_with_code` extrinsic. The wasm file is
read from `contracts/<name>/target/wasm32-unknown-unknown/release/<name>.wasm`
and instantiated with the constructor selector + SCALE-encoded args.

ink! 3.0.0-rc3 selectors are the default `blake2_256(message_name)[..4]`.
We never went out of our way to override them, so the default rule
suffices for both constructor and message dispatch.
"""

import os
import sys
from pathlib import Path

from chain import connect, alice
from selectors import selector

PLANCK = 10 ** 14
DEFAULT_ENDOWMENT = 10 * PLANCK
DEFAULT_GAS = 1_000_000_000_000  # old u64 Weight; bumps if "OutOfGas"

REPO_ROOT = Path(__file__).resolve().parent.parent


def wasm_path(name: str) -> Path:
    return (REPO_ROOT / "contracts" / name / "target" / "wasm32-unknown-unknown"
            / "release" / f"{name}.wasm")


def deploy(
    name: str,
    constructor: str = "new",
    args_encoded: bytes = b"",
    endowment: int = DEFAULT_ENDOWMENT,
    gas_limit: int = DEFAULT_GAS,
    salt: bytes = b"\x00",
):
    wp = wasm_path(name)
    if not wp.is_file():
        raise FileNotFoundError(
            f"no wasm at {wp}; run docker/build-contract.sh {name} first")
    with open(wp, "rb") as f:
        wasm = f.read()
    data = selector(constructor) + args_encoded

    s = connect()
    call = s.compose_call("Contracts", "instantiate_with_code", {
        "endowment": endowment,
        "gas_limit": gas_limit,
        "code": "0x" + wasm.hex(),
        "data": "0x" + data.hex(),
        "salt": "0x" + salt.hex(),
    })
    ext = s.create_signed_extrinsic(call=call, keypair=alice())
    rcpt = s.submit_extrinsic(ext, wait_for_inclusion=True)
    err = rcpt.error_message["name"] if isinstance(rcpt.error_message, dict) else rcpt.error_message
    if not rcpt.is_success:
        raise RuntimeError(f"deploy failed: {err}")

    def attr(a):
        return a["value"] if isinstance(a, dict) else a

    addr = None
    code_hash = None
    for event in rcpt.triggered_events:
        ev = event.value["event"]
        if ev["module_id"] == "Contracts":
            if ev["event_id"] == "Instantiated":
                addr = attr(ev["attributes"][1])
            elif ev["event_id"] == "CodeStored":
                code_hash = attr(ev["attributes"][0])

    print(f"DEPLOYED {name}")
    print(f"  block      {rcpt.block_hash}")
    print(f"  extrinsic  {rcpt.extrinsic_hash}")
    print(f"  fee        {rcpt.total_fee_amount / PLANCK:.6f} POT")
    print(f"  code_hash  {code_hash}")
    print(f"  address    {addr}")

    addr_file = REPO_ROOT / "scripts" / f"{name}_address.txt"
    addr_file.write_text(addr + "\n")
    s.close()
    return addr


if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "registry"
    constructor = sys.argv[2] if len(sys.argv) > 2 else "new"
    salt = bytes.fromhex(sys.argv[3]) if len(sys.argv) > 3 else b"\x00"
    deploy(name, constructor=constructor, salt=salt)

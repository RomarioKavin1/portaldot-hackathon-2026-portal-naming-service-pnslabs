"""Deploy a raw pallet-contracts test fixture via instantiate_with_code.

No ink! metadata is involved. The fixture's deploy()/call() consume input
bytes via seal_input; ok_trap_revert switches on the first byte (0=ok,
1=revert, 2=trap). Constructor input [0] = succeed.

Captures the deployed contract's AccountId from the Instantiated event and
writes it to scripts/<name>_address.txt for the call script.
"""
import sys
from chain import connect, alice

PLANCK = 10 ** 14
ENDOWMENT = 10 * PLANCK            # 10 POT, well above ED (1 POT)
GAS_LIMIT = 500_000_000_000        # old u64 Weight

def deploy(wasm_path: str, salt_hex: str = "0x00", ctor_input: bytes = b"\x00"):
    with open(wasm_path, "rb") as f:
        wasm = f.read()
    code_hex = "0x" + wasm.hex()
    name = wasm_path.split("/")[-1].replace(".wasm", "")

    s = connect()
    call = s.compose_call("Contracts", "instantiate_with_code", {
        "endowment": ENDOWMENT,
        "gas_limit": GAS_LIMIT,
        "code": code_hex,
        "data": "0x" + ctor_input.hex(),
        "salt": salt_hex,
    })
    ext = s.create_signed_extrinsic(call=call, keypair=alice())
    rcpt = s.submit_extrinsic(ext, wait_for_inclusion=True)
    assert rcpt.is_success, f"instantiate failed: {rcpt.error_message}"

    def attr_value(a):
        return a["value"] if isinstance(a, dict) else a

    contract_addr = None
    code_hash = None
    for event in rcpt.triggered_events:
        ev = event.value["event"]
        if ev["module_id"] == "Contracts":
            if ev["event_id"] == "Instantiated":
                contract_addr = attr_value(ev["attributes"][1])
            elif ev["event_id"] == "CodeStored":
                code_hash = attr_value(ev["attributes"][0])
    assert contract_addr, "no Instantiated event in receipt"

    print(f"DEPLOYED {name}")
    print(f"  block      {rcpt.block_hash}")
    print(f"  extrinsic  {rcpt.extrinsic_hash}")
    print(f"  fee        {rcpt.total_fee_amount / PLANCK:.6f} POT")
    print(f"  code_hash  {code_hash}")
    print(f"  address    {contract_addr}")

    with open(f"{name}_address.txt", "w") as f:
        f.write(contract_addr)
    s.close()
    return contract_addr

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "fixtures/ok_trap_revert.wasm"
    salt = sys.argv[2] if len(sys.argv) > 2 else "0x00"
    deploy(path, salt_hex=salt)

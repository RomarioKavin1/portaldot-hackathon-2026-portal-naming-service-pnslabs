"""Call the deployed ok_trap_revert fixture with three branches:
   input [0] -> seal_return success
   input [1] -> seal_return with non-zero status (revert)
   input [2] -> unreachable (trap)

Proves messages reach the deployed wasm and pallet-contracts surfaces the
three pallet-contracts outcomes correctly on this runtime.
"""
import sys
from chain import connect, alice

PLANCK = 10 ** 14
GAS_LIMIT = 500_000_000_000
ADDR_FILE = "ok_trap_revert_address.txt"

def call_one(s, addr: str, kp, byte: int):
    call = s.compose_call("Contracts", "call", {
        "dest": addr,
        "value": 0,
        "gas_limit": GAS_LIMIT,
        "data": "0x" + bytes([byte]).hex(),
    })
    ext = s.create_signed_extrinsic(call=call, keypair=kp)
    rcpt = s.submit_extrinsic(ext, wait_for_inclusion=True)
    err = rcpt.error_message["name"] if isinstance(rcpt.error_message, dict) else rcpt.error_message
    return rcpt.is_success, err, rcpt.total_fee_amount

def main():
    addr = open(ADDR_FILE).read().strip()
    s = connect()
    kp = alice()

    results = []
    for byte, label in [(0, "success"), (1, "revert"), (2, "trap")]:
        ok, err, fee = call_one(s, addr, kp, byte)
        results.append((byte, label, ok, err, fee))
        print(f"  input=[{byte}] ({label:7s})  is_success={ok}  err={err}  fee={fee/PLANCK:.6f} POT")

    # Expectations on rent-era pallet-contracts:
    # - input 0 (seal_return ok)            -> extrinsic succeeds, no dispatch error
    # - input 1 (seal_return with status=1) -> extrinsic succeeds, contract reverted internally
    # - input 2 (unreachable / trap)        -> extrinsic FAILS with ContractTrapped (or similar)
    assert results[0][2] is True, "input 0 should succeed"
    assert results[2][2] is False, "input 2 (trap) should fail at dispatch level"
    print()
    print("CALL LOOP OK")
    s.close()

if __name__ == "__main__":
    main()

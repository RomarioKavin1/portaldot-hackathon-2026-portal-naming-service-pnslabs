"""Cross-contract probe — architecture gate for the 5-contract PNS design.

Calls probe_caller with three (callee_input, expected_rc) pairs, each
forwarded into ok_trap_revert. Caller traps if observed != expected, so
the on-chain extrinsic surfaces a mismatch as ContractTrapped.

Expectations (rent-era pallet-contracts 3.0.0):
   callee_input  callee result        seal_call ReturnCode
   ------------  -------------------  --------------------
   0x00          seal_return ok       0  (Success)
   0x01          seal_return status=1 2  (CalleeReverted)
   0x02          unreachable trap     1  (CalleeTrapped)
"""
from substrateinterface.utils.ss58 import ss58_decode
from chain import connect, alice

PLANCK = 10 ** 14
GAS_LIMIT = 500_000_000_000

def main():
    callee = open("ok_trap_revert_address.txt").read().strip()
    caller = open("probe_caller_address.txt").read().strip()
    callee_pubkey = bytes.fromhex(ss58_decode(callee))
    assert len(callee_pubkey) == 32

    s = connect()
    kp = alice()

    cases = [(0x00, 0, "callee succeeds"),
             (0x01, 2, "callee reverts -> CalleeReverted"),
             (0x02, 1, "callee traps   -> CalleeTrapped")]

    for callee_in, expected_rc, label in cases:
        data = callee_pubkey + bytes([callee_in, expected_rc])
        assert len(data) == 34
        call = s.compose_call("Contracts", "call", {
            "dest": caller,
            "value": 0,
            "gas_limit": GAS_LIMIT,
            "data": "0x" + data.hex(),
        })
        ext = s.create_signed_extrinsic(call=call, keypair=kp)
        rcpt = s.submit_extrinsic(ext, wait_for_inclusion=True)
        err = rcpt.error_message["name"] if isinstance(rcpt.error_message, dict) else rcpt.error_message
        print(f"  in=0x{callee_in:02x} exp_rc={expected_rc} "
              f"({label}): is_success={rcpt.is_success} err={err}")
        assert rcpt.is_success, (
            f"FAIL: cross-contract call returned an unexpected ReturnCode "
            f"(probe_caller trapped). dispatch_err={err}")

    print()
    print("CROSS_CONTRACT_CALL OK")
    s.close()

if __name__ == "__main__":
    main()

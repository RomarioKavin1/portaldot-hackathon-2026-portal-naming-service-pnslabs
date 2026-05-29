"""Drip POT from //Alice (dev faucet master). Must send >= 1 POT (ExistentialDeposit)."""
import sys
from chain import connect, alice

PLANCK = 10 ** 14  # 14 decimals

def drip(recipient: str, pot: float = 10.0):
    s = connect()
    call = s.compose_call("Balances", "transfer",
                          {"dest": recipient, "value": int(pot * PLANCK)})
    ext = s.create_signed_extrinsic(call=call, keypair=alice())
    rcpt = s.submit_extrinsic(ext, wait_for_inclusion=True)
    assert rcpt.is_success, f"transfer failed: {rcpt.error_message}"
    acct = s.query("System", "Account", [recipient])
    bal = acct.value["data"]["free"] / PLANCK
    print(f"dripped {pot} POT -> {recipient}; balance now {bal} POT")
    s.close()
    return bal

if __name__ == "__main__":
    drip(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 10.0)

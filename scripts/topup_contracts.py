"""Top up every deployed PNS contract so it can pay storage rent.

pallet-contracts 3.0.0 charges per-block storage rent against each contract's
own balance. When a contract's balance runs out, ALL calls and even dry-run
reads fail with `RentNotPaid`, which surfaces as: mints revert and every name
resolves to nothing (shows "Available"). Re-run this to revive them.

    .venv/bin/python scripts/topup_contracts.py [POT_PER_CONTRACT]

Default 1000 POT each.
"""

import json
import sys
from pathlib import Path

from chain import connect, alice

REPO_ROOT = Path(__file__).resolve().parent.parent
PLANCK = 10 ** 14


def main() -> None:
    pot = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
    addrs = json.loads((REPO_ROOT / "scripts" / "pns_addresses.json").read_text())
    s = connect()
    a = alice()
    for name, addr in addrs.items():
        call = s.compose_call("Balances", "transfer",
                              {"dest": addr, "value": pot * PLANCK})
        ext = s.create_signed_extrinsic(call=call, keypair=a)
        rc = s.submit_extrinsic(ext, wait_for_inclusion=True)
        ok = "OK" if rc.is_success else f"FAILED ({rc.error_message})"
        print(f"  {name:22s} +{pot} POT  {ok}")
    print("done")


if __name__ == "__main__":
    main()

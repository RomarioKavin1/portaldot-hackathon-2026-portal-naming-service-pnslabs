"""Admin one-off: open the RegistrarController commit-age window.

The controller defaults to min_commit_age_ms = 60_000 (commit must age 60s
before register). The dApp commits and registers in one flow (~seconds apart),
so register() reverts with CommitmentTooNew. Setting the window to (0, 7d) as
admin (//Alice) lets any user commit + register immediately.

    .venv/bin/python scripts/set_commit_window.py

Run this once against a fresh deployment (deploy_pns.py now does it too).
"""

import json
from pathlib import Path

from chain import connect, alice
from selectors import selector

REPO_ROOT = Path(__file__).resolve().parent.parent
MIN_MS = 0
MAX_MS = 7 * 24 * 3600 * 1000


def main() -> None:
    addrs = json.loads((REPO_ROOT / "scripts" / "pns_addresses.json").read_text())
    controller = addrs["registrar_controller"]
    s = connect()
    a = alice()

    args = MIN_MS.to_bytes(8, "little") + MAX_MS.to_bytes(8, "little")
    data = selector("set_commit_age_window") + args
    c = s.compose_call("Contracts", "call", {
        "dest": controller,
        "value": 0,
        "gas_limit": 1_000_000_000_000,
        "data": data,
    })
    ext = s.create_signed_extrinsic(call=c, keypair=a)
    rc = s.submit_extrinsic(ext, wait_for_inclusion=True)
    assert rc.is_success, "set_commit_age_window extrinsic failed"
    print(f"set_commit_age_window(0, 7d) on {controller} — block {rc.block_hash}")


if __name__ == "__main__":
    main()

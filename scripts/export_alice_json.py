"""Export //Alice as a Polkadot.js extension-compatible JSON file.

Drag the resulting `alice.json` into the Polkadot.js browser extension
("+" -> "Restore from JSON"). The password is `password` (literally).
After import the extension lists Alice as a usable account at
5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY, with full POT for
registrations.
"""
import json
from pathlib import Path
from substrateinterface import Keypair

OUT = Path(__file__).resolve().parent / "alice.json"
PASSWORD = "password"

kp = Keypair.create_from_uri("//Alice", ss58_format=42)
data = kp.export_to_encrypted_json(passphrase=PASSWORD, name="Alice (dev)")
OUT.write_text(json.dumps(data, indent=2) + "\n")
print(f"wrote {OUT}")
print(f"  address  : {kp.ss58_address}")
print(f"  password : {PASSWORD}")
print("\nImport: open the Polkadot.js extension -> '+' menu ->")
print("'Restore account from backup JSON file' -> pick this file ->")
print(f"enter password '{PASSWORD}'.")

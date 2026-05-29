# Portaldot RPC Node — Developer Reference

All facts verified by live connections on 2026-05-29. Do not copy this file for
production use — the node is a development chain with no real economic value.

---

## 1. Endpoints

| Endpoint                            | URL                                  |
| ----------------------------------- | ------------------------------------ |
| **Public WSS** (Cloudflare-proxied) | `wss://portaldot.philotheephilix.in` |
| **Local WS** (same machine as node) | `ws://127.0.0.1:9944`                |

Both endpoints reach the same node and return identical chain state.

**Polkadot-JS Apps** — navigate to
[https://polkadot.js.org/apps/](https://polkadot.js.org/apps/), open the
network selector, choose "Development → Custom", paste
`wss://portaldot.philotheephilix.in`, and click Switch.

---

## 2. Chain Parameters

| Parameter             | Value                                                       |
| --------------------- | ----------------------------------------------------------- |
| Chain name (reported) | `Development`                                               |
| System / node name    | `Portaldot Node`                                            |
| Spec name             | `portaldot`                                                 |
| Spec version          | `1002`                                                      |
| Token symbol          | `POT` (application convention; node reports `UNIT`)         |
| Token decimals        | **14** — hardcoded in app; `system_properties` returns `{}` |
| SS58 address format   | **42** (generic Substrate)                                  |
| ExistentialDeposit    | `100_000_000_000_000` planck = **1 POT**                    |
| Planck conversion     | `1 POT = 10^14 planck`                                      |

**Planck formula**

```
planck_amount = pot_amount * 10**14
pot_amount    = planck_amount / 10**14
```

---

## 3. Connecting — Python (substrate-interface)

### Critical gotcha

The Portaldot dev node uses pre-V14 SCALE metadata (Substrate node-template
lineage). Without both `ss58_format=42` **and**
`type_registry_preset='substrate-node-template'`, any call to `System.Account`
raises `NotImplementedError: Decoder class for "AccountInfo<Index, AccountData>"
not found`. Always pass both parameters.

### Verified connect snippet

```python
from substrateinterface import SubstrateInterface, Keypair

substrate = SubstrateInterface(
    url="wss://portaldot.philotheephilix.in",   # or ws://127.0.0.1:9944
    ss58_format=42,
    type_registry_preset='substrate-node-template',
)

print(substrate.chain)          # Development
print(substrate.name)           # Portaldot Node
print(substrate.ss58_format)    # 42

head = substrate.get_chain_head()
block_num = substrate.get_block_number(head)
print(block_num)                # e.g. 456 (verified live)

# Query any account balance
alice_addr = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
acct = substrate.query("System", "Account", [alice_addr])
free_planck = acct.value["data"]["free"]
print(free_planck / 10**14, "POT")

substrate.close()
```

**Verified output (2026-05-29, block 456):**

```
chain=Development  name=Portaldot Node  ss58=42
block: 456
Alice free: 4982677286807942715 planck  (49826.77 POT)
Public WSS and local WS return identical values.
```

### Connecting — JavaScript (@polkadot/api)

```js
import { ApiPromise, WsProvider } from "@polkadot/api";

const provider = new WsProvider("wss://portaldot.philotheephilix.in");
const api = await ApiPromise.create({ provider });
console.log(api.genesisHash.toHex());
```

No special type overrides are needed from the JS side for basic balance queries.
For best compatibility with the ss58 prefix, pass `{ ss58Format: 42 }` in the
options if constructing addresses client-side.

---

## 4. Well-Known Dev Accounts

These are the standard Substrate development accounts. They are derived from the
canonical dev mnemonic:

```
bottom drive obey lake curtain smoke basket hold race lonely fit walk
```

The URI shortcuts `//Alice`, `//Bob`, etc. are "hard derivation paths" applied on
top of that seed phrase. Because the seed is public knowledge, **anyone can
reproduce these keys** — they have no security on any network.

All addresses below are `sr25519`, `ss58_format=42`.

| URI              | SS58 Address (format 42)                           | Crypto  | Notes                          |
| ---------------- | -------------------------------------------------- | ------- | ------------------------------ |
| `//Alice`        | `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` | sr25519 | **Faucet master + chain Sudo** |
| `//Bob`          | `5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty` | sr25519 |                                |
| `//Charlie`      | `5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y` | sr25519 |                                |
| `//Dave`         | `5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy` | sr25519 |                                |
| `//Eve`          | `5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw` | sr25519 |                                |
| `//Ferdie`       | `5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL` | sr25519 |                                |
| `//Alice//stash` | `5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY` | sr25519 |                                |
| `//Bob//stash`   | `5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc` | sr25519 |                                |

> All addresses verified by running
> `Keypair.create_from_uri(uri, ss58_format=42).ss58_address`
> against the live node on 2026-05-29.

**Deriving addresses in Python:**

```python
from substrateinterface import Keypair

kp = Keypair.create_from_uri("//Alice", ss58_format=42)
print(kp.ss58_address)   # 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY

# Or from the full mnemonic + path:
kp2 = Keypair.create_from_uri(
    "bottom drive obey lake curtain smoke basket hold race lonely fit walk//Alice",
    ss58_format=42,
)
print(kp2.ss58_address == kp.ss58_address)  # True
```

---

## 5. Creating / Importing a New Account

### Generate a fresh keypair (Python)

```python
from substrateinterface import Keypair

# 1. Generate a random BIP-39 mnemonic (12 words)
mnemonic = Keypair.generate_mnemonic()

# 2. Derive an sr25519 keypair at ss58_format=42
kp = Keypair.create_from_mnemonic(mnemonic, ss58_format=42)

print("Mnemonic:", mnemonic)
print("Address: ", kp.ss58_address)
```

**Real generated example (2026-05-29):**

```
Mnemonic : bag truly adjust bind today romance zero physical olive success joke enroll
Address  : 5EtGGMrF3u31EXshQPaxMs2CpMqHFD5BkBzz8KJeQegVVQgb
```

Store the mnemonic securely. Anyone with it can recreate the keypair.

### Import into Polkadot-JS extension

1. Open the extension, click **+**, choose "Import account from pre-existing seed".
2. Paste the 12-word mnemonic.
3. Under "keypair crypto type" select **sr25519**.
4. The network prefix is auto-detected; force it to **42 (Substrate)** if needed.

### Import via subkey (Docker, x86-64)

```bash
docker run --rm --platform=linux/amd64 \
  -v /home/ubuntu/portaldot-node/portaldot-testnet-ubuntu:/n \
  ubuntu:22.04 /n/subkey inspect \
  "bag truly adjust bind today romance zero physical olive success joke enroll"
```

---

## 6. Funding an Account (Faucet)

### Method A — Direct on-chain transfer (Python)

Alice is pre-funded (~49,800 POT at time of writing) and is the Sudo key.
Transfer 10 POT to any address:

```python
from substrateinterface import SubstrateInterface, Keypair

substrate = SubstrateInterface(
    url="wss://portaldot.philotheephilix.in",
    ss58_format=42,
    type_registry_preset='substrate-node-template',
)

alice = Keypair.create_from_uri("//Alice", ss58_format=42)
recipient = "5GeQKa8wepW8jWbRJ16TXL3mWUjo3PCF7m4GUy6bQGYpQGAJ"  # replace with your address

call = substrate.compose_call("Balances", "transfer", {
    "dest": recipient,
    "value": 10 * 10**14,   # 10 POT in planck
})
ext  = substrate.create_signed_extrinsic(call=call, keypair=alice)
rcpt = substrate.submit_extrinsic(ext, wait_for_inclusion=True)

print(rcpt.is_success)          # True
print(rcpt.extrinsic_hash)
print(rcpt.block_hash)
print(rcpt.total_fee_amount, "planck fee")   # ~1.18e12 planck

acct = substrate.query("System", "Account", [recipient])
print(acct.value["data"]["free"] / 10**14, "POT")   # 10.0

substrate.close()
```

**Note:** ExistentialDeposit = 1 POT. Any transfer to a new (zero-balance)
account must be >= 1 POT or the extrinsic is rejected with
`Balances.ExistentialDeposit`. The 10 POT drip always clears this threshold.

**Verified live drip (2026-05-29):**

```
Recipient : 5GeQKa8wepW8jWbRJ16TXL3mWUjo3PCF7m4GUy6bQGYpQGAJ
Balance before  : 0 planck
Extrinsic hash  : 0x193ad0b3eb1b172d70ef895f7132bce4429c04d8fff55be9df4c7f9d70221a61
Block hash      : 0xc47ccc6d32879de651857e1ac51e2b97f05046b9d509a818829b3a19554b17a2
Success         : True
Fee             : 1176258434482 planck  (0.011763 POT)
Balance after   : 1000000000000000 planck  (10.000000 POT)
```

### Method B — Via the PortalFlow app API

The backend wraps the same transfer in a workflow engine. After signup, a
"Claim Testnet POT" workflow is automatically created for every user.

**Step 1 — Sign up:**

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"TestPass123!","name":"Dev User"}'
```

Response includes a JWT `token` and a `walletAddress` (ss58_format=42 address
auto-generated by the server).

**Step 2 — List workflows to get the faucet workflow ID:**

```bash
TOKEN="<token from signup>"
curl -s http://localhost:8000/api/v1/workflows \
  -H "Authorization: Bearer $TOKEN"
```

Look for `"name": "Claim Testnet POT"` and note its `"id"` (e.g. `wf_543c0b6b32`).

**Step 3 — Run the workflow:**

```bash
curl -s -X POST http://localhost:8000/api/v1/workflows/wf_543c0b6b32/run \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{}'
```

On success the response contains `"status": "Success"` and the on-chain
`extrinsicHash` / `blockHash`. The wallet is credited 10 POT.

**Step 4 — Confirm balance:**

```bash
curl -s http://localhost:8000/api/v1/wallet \
  -H "Authorization: Bearer $TOKEN"
# → {"address":"5G...","balance":10.0,"reserved":0.0,"ss58Format":42}
```

---

## 7. Troubleshooting

### `NotImplementedError: Decoder class for "AccountInfo<Index, AccountData>" not found`

**Cause:** `SubstrateInterface` was constructed without
`type_registry_preset='substrate-node-template'`. The node uses pre-V14 SCALE
metadata; without the preset the `AccountInfo` type cannot be decoded.

**Fix:** Always include both parameters:

```python
SubstrateInterface(
    url="...",
    ss58_format=42,
    type_registry_preset='substrate-node-template',  # required
)
```

### `ConnectionResetError` / WebSocket closed immediately

The node may still be warming up (first ~3 s after restart). Wait a few seconds
and retry. The error is transient.

### `Balances.ExistentialDeposit` dispatch error

A transfer to a zero-balance account requires at least 1 POT
(`100_000_000_000_000` planck). Increase the transfer value or use
`transfer_keep_alive` which enforces this automatically.

### `token_decimals` returns `None`

`system_properties` returns an empty object (`{}`). The application hardcodes
`14` decimals. Always use `10**14` as the planck multiplier.

### Fee-estimation fails on fresh node

`payment_queryInfo` requires at least one finalized block. Wait for the first
block (~6 s after node start) before calling `substrate.get_payment_info`.

---

## 8. Security Notes

**This is an unguarded development node — no real economic value.**

- The node starts with `--rpc-methods Unsafe`. All unsafe RPC methods
  (`author_rotateKeys`, state mutation queries, etc.) are publicly accessible
  over the internet without any authentication.
- Anyone who can reach `wss://portaldot.philotheephilix.in` can submit
  extrinsics, query full chain state, and call unsafe methods.
- Alice (`//Alice`) is both the **faucet master** and the **chain Sudo key**.
  Her private key is reproducible by anyone from the public URI `//Alice`. This
  is only acceptable on a throw-away dev chain.
- **Chain state resets on every node restart.** All balances, nonces, and
  on-chain data are discarded.
- Never use any URI, mnemonic, or address from this document on Polkadot mainnet
  or any network with real economic value.

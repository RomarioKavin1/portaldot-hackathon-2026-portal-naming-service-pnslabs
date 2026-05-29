# Portal Naming Service — Design Spec

**Date:** 2026-05-30 (updated same day with live-node probe results)
**Status:** Approved design, pre-implementation
**Target chain:** Portaldot — Substrate/Polkadot-SDK standalone L1, **old (~2021-era, metadata V13) `pallet-contracts` → ink! ~3.x**, non-EVM. Verified identical on mainnet and dev node (spec 1002).
**Namespace:** `.pot`

---

## 1. Overview

Portal Naming Service (PNS-pot) is an ENS-style decentralized naming system for the
Portaldot chain, built as **ink! (Rust → Wasm) smart contracts** on `pallet-contracts`.
It maps human-readable names like `alice.pot` to accounts and records, and extends the
ENS model with three signature features: **on-chain profile/identity**,
**name-based payments**, and **programmable subnames**.

The product is designed as a **real ecosystem product foundation** (ENS-grade
architecture, upgradeable, full feature set), not merely a hackathon MVP — though a
demoable slice (the v1 scope below) can be presented for the Portaldot Mini Hackathon
(Onchain Identity & Coordination track).

### Goals
- Permissionless registration of `.pot` names with sustainable, anti-squatting economics.
- ENS-faithful, modular, upgradeable contract architecture.
- A name is a portable Web3 **identity**, a **payment handle**, and a **namespace** the
  owner can delegate via subnames.
- A clean off-chain resolution layer (TS SDK + reference dApp) that enforces safety
  invariants so integrators cannot skip them.

### Non-goals (v1)
- EVM compatibility (Portaldot is not EVM; all contracts are ink!).
- Cross-chain / omnichain resolution (deferred to v2).
- USD-pegged pricing via oracle (v1 prices directly in POT; oracle is a v2 upgrade).
- Streaming/subscription payments, open subname marketplace, reputation scoring,
  attestation issuance UI (all v2 — data models designed in, UIs deferred).

---

## 2. Platform Constraints (VERIFIED against live nodes, 2026-05-30)

> **Important:** the official docs (`https://portaldot-dev.readthedocs.io/en/latest/`)
> describe a *modern* `pallet-contracts` (storage deposits, `maxTransientStorageSize`,
> `apiVersion`, Weight V2). **This is inaccurate.** Direct WebSocket probes of both the
> dev node and mainnet show an **old, ~2021-era runtime**. Build for the verified
> reality below, not the docs.

### Verified runtime (mainnet + dev node are byte-identical)
Probed `wss://mainnet.portaldot.io` and `wss://portaldot.philotheephilix.in`:

- **Substrate/Polkadot-SDK standalone L1** (BABE + GRANDPA + NPoS). Not a parachain.
- `specName=portaldot`, `specVersion=1002`, node `2.0.0-unknown`, **metadata V13**
  (pre-dates the V14 switch of ~Sept 2021). Mainnet and dev node return the **same
  153,205-byte metadata** — identical runtime.
- **`Contracts` pallet present** (`contracts_call`, `contracts_instantiate`,
  `contracts_getStorage` RPCs) → ink! contracts ARE deployable. **Not EVM** (no
  `Ethereum`/`EVM`/`Revive` pallets).
- **Old pallet-contracts (~2021 / ink! ~3.0-rc / 2.x era):**
  - **No storage deposits** (`storage_deposit`, `depositPerByte`, `OwnerInfoOf` all
    absent). Fees are **old `u64` Weight** only (no Weight V2).
  - **No code/instance separation** (`upload_code` absent) → deploy via
    **`instantiate_with_code`** only; cannot pre-upload a code hash the modern way.
  - Classic storage items present: `ContractInfoOf`, `CodeStorage`, `PristineCode`,
    `DeletionQueue`.
- **POT token, 14 decimals** (1 POT = 10^14 planck). **ExistentialDeposit = 1 POT.**
- **SS58 accounts (prefix 42)**, sr25519/ed25519. No 0x/EVM addresses.
- **`pallet-identity` is the CLASSIC version** (identity, judgements, subs) —
  **no native usernames** (`set_username_for` absent). We integrate **read-only** with
  registrar **judgements** for verification badges; no authority role needed.
- Other native pallets present: `balances`, `assets`, `staking`, `scheduler`, `proxy`,
  `multisig`.

### Toolchain implications (binding constraints)
- Target **old ink! (~3.0-rc / 2.x)** + a matching **old `cargo-contract`** + old
  contract-metadata format. Modern ink! 5.x / cargo-contract WILL NOT deploy here.
- **PSP-34 is unavailable** (needs ink! 4.x+ / OpenBrush) — use a custom in-contract
  ownership map instead (see §4).
- Metadata is **pre-V14**, so `@polkadot/api` / `substrate-interface` need legacy type
  handling. Python `substrate-interface` requires
  `type_registry_preset='substrate-node-template'` + `ss58_format=42` (verified).
- ⚠️ **Build risk:** compiling ~2021-era ink! in 2026 needs an old Rust nightly + old
  wasm target + old `cargo-contract`. **First implementation task = pin & verify the
  exact ink!/cargo-contract version by deploying one trivial contract to the dev node**
  before building anything else (see §10, §12).

### Environment & faucet (verified — see `rpc.md` in repo root)
- **Endpoints:** mainnet `wss://mainnet.portaldot.io`; dev node public
  `wss://portaldot.philotheephilix.in`, local `ws://127.0.0.1:9944`.
- **Faucet (dev node):** `//Alice` is pre-funded + Sudo + faucet master; drip via a
  direct `Balances.transfer` (≥1 POT to clear ExistentialDeposit), or via the PortalFlow
  app API.
- ⚠️ **Dev node wipes all state on every restart** — deployed contracts and
  registrations do not persist. A redeploy/seed script is required for dev/demo.

---

## 3. Architecture

Five ink! contracts, ENS-faithful separation of concerns. The separation keeps the
Registry minimal and durable, isolates allocation policy in a swappable controller, and
isolates record semantics in an upgradeable resolver.

```
Registry  (source of truth — minimal, rarely changes)
  Mapping<Node, { owner, resolver, ttl }>
  setOwner · setResolver · setSubnodeOwner · owner() · resolver()
     ▲ owns ".pot" node                 ▲ each node points to a resolver
     │                                   │
PotRegistrar (.pot)               PublicResolver
  • owns the .pot node              addr(node, coinType) · text(node, key)
  • names = custom ownership map    payment(node) · profile(node) · name(node)
    (NFT-style; NOT PSP-34)
  • expiries, grace, auction
  • authorizes Controllers
     ▲ calls
RegistrarController               ReverseRegistrar
  • commit-reveal                   • manages <addr>.addr.reverse
  • length-based POT pricing        • claim() · setName()  (address → name)
  • collects rent

SubnameRegistrar
  • owner of any .pot name mints children (alice.dao.pot)
  • "fuses-lite" burn-only permission flags; subname expiry ≤ parent
  • optional per-subname price (issuance + paid self-mint in v1)
```

### Contract responsibilities

- **Registry** — knows only *who owns a node* and *which resolver answers for it*
  (plus TTL). Durability anchor; almost never replaced.
- **PotRegistrar** — owns the `.pot` node in the Registry; records each second-level
  name's owner in a **custom in-contract ownership map** (NFT-style transfer/approve
  semantics, but **not PSP-34** — that standard needs ink! 4.x+, unavailable here);
  tracks expiry; runs grace + premium auction. Authorizes one or more Controllers.
- **RegistrarController** — public-facing registration policy: commit-reveal, length
  pricing, POT rent collection. Swappable without touching ownership records.
- **PublicResolver** — holds all records, including the three signature record types and
  the reverse `name` record. (Upgradeability: the old runtime lacks modern
  `set_code_hash` ergonomics, so "upgrade" = deploy a new resolver and re-point names'
  resolver field in the Registry — the Registry indirection makes this clean.)
- **ReverseRegistrar** — manages the `addr.reverse` namespace for address→name.
- **SubnameRegistrar** — programmable subname issuance with permission flags.

### Hashing
Use **blake2_256** (Substrate-native, cheaper in ink!; no EVM-compat reason to keep
keccak). Same recursive structure as ENS namehash:

```
labelhash(label) = blake2_256(normalized_label_bytes)
node(root)       = 0x00..00 (32 zero bytes)
node(a.parent)   = blake2_256( node(parent) ‖ labelhash(a) )
```

---

## 4. Name Model

- A name is a UTF-8 string (`alice.pot`). Clients **normalize** first (ENSIP-15-style:
  lowercase, NFC, reject zero-width/confusable/homograph chars) to prevent spoofing.
- On-chain key is the 32-byte **node** (see hashing above). Fixed-size keys give O(1)
  lookups at any depth, no on-chain string handling, and a small storage footprint.
- **Name ownership (custom, NOT PSP-34):** `PotRegistrar` keeps a
  `Mapping<labelhash, owner>` plus `transfer` / `approve` methods (ERC-721-like
  semantics implemented in-contract, since PSP-34 needs ink! 4.x+ which this runtime
  lacks). Owning that entry = owning the registration (the "registrant"). Registry
  ownership can be delegated to a separate manager/controller account.

### Records (compact on-chain; large data off-chain via content hash)

| Record | Shape | Used by |
|---|---|---|
| `addr(node, coinType)` | bytes (SS58 native = primary; others optional) | resolution / payments |
| `text(node, key)` | string (`com.twitter`, `avatar`, `url`, `description`, …) | profile |
| `payment(node)` | `{ recipient: AccountId, preferred_asset: Option<AssetId>, memo: Option<Hash> }` | name-based payments |
| `profile(node)` | `{ display_name, bio_hash, avatar_contenthash, verified: bool }` | identity |
| `name(node)` | string | reverse resolution |

Large blobs (avatar image, bio document) are stored on IPFS/Arweave; only the content
hash is stored on-chain. (This runtime has no storage-deposit fee, but compact records
still keep contract state small and reads cheap — good practice regardless.)

---

## 5. Registration Lifecycle & Economics

### Commit–reveal (anti-front-running)
```
1. commit(hash)      hash = blake2_256(name ‖ owner ‖ secret)   // name hidden
        wait min_commit_age (~60s) and within max_commit_age
2. register(name, owner, duration, secret, resolver?)
        → Controller verifies commitment + availability,
          collects POT rent for `duration`, then PotRegistrar:
            • records owner in the custom ownership map (NFT-style)
            • sets Registry owner + optional resolver
            • records expiry = now + duration
        → emits NameRegistered
```

### Economics — annual rent + grace + premium auction
- **Length-based annual POT price tiers** (governance-adjustable params), e.g. 1–2 chars
  premium, 3 chars high, 4 chars medium, 5+ base. (USD-peg oracle is a v2 swap of the
  Controller; v1 prices directly in POT.)
- **Renewal:** `renew(name, duration)` extends expiry; anyone may pay (gift renewals OK).
- **Grace period** (~90 days) after expiry: only prior owner may renew; name not yet
  re-registerable; resolution treats expired names as unresolvable.
- **Premium release auction:** after grace, name enters a decaying-price (Dutch) premium
  starting high and decaying to base over a window (~21 days), so desirable expired names
  clear at a market price rather than being sniped.

### Access-control invariants
- Only a node's **owner** may `setResolver` / `setSubnodeOwner` / set its records.
- Only **PotRegistrar** creates second-level `.pot` nodes; only authorized **Controllers**
  drive registration.
- Resolution everywhere checks **not-expired** before returning records.

---

## 6. Signature Features

### 6.1 On-chain Profile & Identity
- **Profile record** + standard `text` socials (`com.twitter`, `com.github`,
  `org.telegram`, `url`, `email`).
- **Native identity verification (read-only):** SDK/resolver reads Portaldot's native
  `pallet-identity` (classic identity + judgements; this runtime has no usernames) for
  the name owner's account; if it has a registrar **judgement** (`Reasonable`/
  `KnownGood`), the profile surfaces a **verified** badge. Pure read integration — no
  authority role needed — avoids runtime coupling, scores on "native deployment."
- **Attestations/credentials (v2):** data model + read path designed in v1; third-party
  signed badges attachable to a name; issuance UI deferred.
- **Reputation (v1 = cheap signals only):** name age + account age + verification,
  computed client-side. No token-weighted scoring in v1.

### 6.2 Name-Based Payments
- **Payment record** `{ recipient, preferred_asset, memo }`; default recipient = resolved
  native address, but owner may route elsewhere (multisig/merchant).
- **SDK** `resolvePayment("alice.pot")` → recipient SS58 + preferred asset; dApp builds
  `balances.transfer` (POT) or a `pallet-assets` transfer (if `preferred_asset` set).
- **Payment requests:** owner publishes `{ amount, asset, memo }` encoded into a
  shareable link/QR; payer scans → prefilled "Pay alice.pot N POT".
- **Safety:** payment resolution runs forward-verification + expiry check; UI shows the
  resolved address + verified badge before signing.
- **Out of scope v1:** streaming/subscription payments.

### 6.3 Programmable Subnames
- **Issuance:** owner of `dao.pot` mints `alice.dao.pot` via `SubnameRegistrar`
  (calls `Registry.setSubnodeOwner`). Subname expiry capped at parent's expiry.
- **"Fuses-lite" permission flags** (compact, burn-only bitfield):
  `CANNOT_TRANSFER`, `CANNOT_SET_RESOLVER` / `CANNOT_EDIT_RECORDS`,
  `PARENT_CANNOT_CONTROL` (emancipation — parent provably can't revoke/reconfigure).
  Burn-only means guarantees are permanent (like ENS fuses).
- **Subname economics:** parent may set a per-subname price for self-minting; a small
  **protocol fee** on paid mints is a built-in revenue path.
- **Marketplace (v2):** secondary listing/transfer UI. v1 ships issuance + permissions +
  paid self-mint.

---

## 7. Off-chain Layer (SDK + dApp)

- **`portal-name-sdk` (TypeScript, `@polkadot/api` + `@polkadot/api-contract`)** — primary
  integration surface. `resolve(name)`, `reverse(address)`, `resolvePayment(name)`,
  `register()`/`commit()` helpers, `normalize(name)`. Enforces the two non-negotiable
  invariants (input normalization; forward-verification on reverse) so integrators can't
  skip them.
- **Python SDK (thin)** — parity wrapper for backend/scripting, aligning with Portaldot's
  documented Python SDK. TS leads; Python follows.
- **Reference dApp (web)** — search/register (commit-reveal with UI-handled wait), manage
  records, set primary name, pay-by-name (QR/link), issue & configure subnames. Also the
  hackathon demo artifact.

**Forward resolution:** `name → normalize → namehash → Registry.resolver(node) →
Resolver.addr/records(node)`, with expiry check at the registrar.
**Reverse:** `address → namehash(<addr>.addr.reverse) → Resolver.name(node) →
re-resolve forward and confirm it maps back to the address` before display.

---

## 8. Security Invariants

- **Front-running:** commit–reveal with min/max commit age.
- **Homograph/spoofing:** client normalization; SDK refuses non-normalized labels; only
  normalized labelhashes are committed.
- **Reverse spoofing:** mandatory forward-verification (in SDK).
- **Authorization:** only node owner mutates its node/records; only PotRegistrar mints
  `.pot` nodes; only authorized Controllers register; subname fuses are burn-only.
- **Expiry safety:** expired names resolve to nothing; grace blocks re-registration;
  release only via premium auction.
- **ink! specifics:** checks-effects-interactions around cross-contract calls
  (reentrancy); bounded per-call storage writes to avoid storage-deposit griefing;
  explicit handling of cross-contract call failures.

---

## 9. Testing Strategy

- **Unit (`#[ink::test]`)** per contract: namehash correctness, access control, pricing
  tiers, expiry/grace transitions, fuse burning, commit-reveal validation.
- **Property tests:** namehash determinism & collision-resistance; normalization
  idempotence.
- **End-to-end (`ink-e2e`)** against a local node: commit → register → set records →
  resolve → reverse → subname issue.
- **SDK tests:** resolve/reverse/register against local node; normalization &
  forward-verification edge cases.

---

## 10. Build, Deployment & Repository

- **Old `cargo-contract`** (version pinned to the runtime — see §12 item 1) builds each
  contract → `.wasm` + legacy metadata. Pin the Rust nightly + wasm target in a Docker
  image / `rust-toolchain.toml` for reproducibility.
- Deploy via **`instantiate_with_code`** (no `upload_code` on this runtime) using
  `@polkadot/api` scripts; polkadot.js Apps "Contracts" UI for manual checks. Note the
  metadata is **V13** — legacy type handling required on the client.
- Develop against the dev node (`wss://portaldot.philotheephilix.in` or local
  `portaldot_dev --dev` at `ws://127.0.0.1:9944`); fund via the Alice-drip faucet. Because
  **dev-node state resets on restart**, a deterministic **redeploy + seed script** is part
  of the deliverable. Mainnet (`wss://mainnet.portaldot.io`) runs the identical runtime
  for eventual production deploy.
- ⚠️ Do not assume modern ink! tooling — verify the exact version FIRST (§12 item 1).
- **Open source** all core contracts (satisfies hackathon requirement), license TBD by owner.

```
portal-name-service/
├── contracts/
│   ├── registry/         ├── pot_registrar/     ├── registrar_controller/
│   ├── public_resolver/  ├── reverse_registrar/ └── subname_registrar/
├── packages/
│   ├── sdk-ts/           └── sdk-py/
├── app/                  (reference web dApp)
├── scripts/              (deploy / seed local node)
└── docs/
```

---

## 11. Scope Summary

**v1 (real foundation, demoable):** all five contracts; commit-reveal registration; annual
rent + grace + premium auction; custom NFT-style name ownership; full record set; profile
+ native pallet-identity read badge; pay-by-name (POT + assets) with payment requests;
subname issuance with fuses + paid self-mint; TS SDK + reference dApp.

**v2 (deferred):** attestation issuance UI, reputation scoring, streaming payments, open
subname marketplace, USD-peg price oracle, cross-chain/omnichain resolution.

---

## 12. Open Questions / To Confirm

**Resolved by the 2026-05-30 probes (see §2, `rpc.md`):**
- ✅ Endpoints + faucet — mainnet `wss://mainnet.portaldot.io`, dev node
  `wss://portaldot.philotheephilix.in` / `ws://127.0.0.1:9944`, Alice-drip faucet.
- ✅ Runtime — spec 1002, metadata V13, old pallet-contracts, no storage deposits,
  ExistentialDeposit 1 POT, classic pallet-identity (no usernames), non-EVM.

**Still open (in priority order):**
1. **🔴 BLOCKING — exact ink! / cargo-contract / contract-metadata version this old
   runtime accepts.** Resolve FIRST by deploying one trivial ink! contract to the dev
   node and iterating versions until `contracts_instantiate` succeeds. Everything else
   depends on this. (Best signal so far: ink! ~3.0-rc / 2.x, old cargo-contract.)
2. **Toolchain reproducibility** — pin the old Rust nightly + wasm target + cargo-contract
   in a Docker image / `rust-toolchain.toml` so the build is reproducible in 2026.
3. **Dev-node persistence** — state resets on restart; need a deterministic redeploy +
   seed script, and confirm whether a non-resetting node is available for the demo.
4. **Pricing** — USD-peg oracle is out (no oracle); confirm POT-denominated tier values.
5. **License** for open-sourcing core contracts.

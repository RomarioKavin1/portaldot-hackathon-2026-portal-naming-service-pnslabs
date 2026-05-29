# Portal Naming Service — Design Spec

**Date:** 2026-05-30
**Status:** Approved design, pre-implementation
**Target chain:** Portaldot (Substrate / Polkadot-SDK standalone L1, ink!/`pallet-contracts`, non-EVM)
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

## 2. Platform Constraints (from Portaldot dev docs)

Confirmed from `https://portaldot-dev.readthedocs.io/en/latest/`:

- **Substrate/Polkadot-SDK standalone L1** (BABE + GRANDPA + NPoS). Not a parachain.
- **Smart contracts via `pallet-contracts` → ink! (Rust/Wasm).** No Solidity/EVM.
- **POT token, 14 decimals.** Gas = weight fees **+ storage deposits per byte/item**.
- **SS58 accounts (prefix 42)**, sr25519/ed25519. No 0x/EVM addresses.
- Native **`pallet-identity` with usernames** exists (authority-gated) — we integrate
  **read-only** for verification badges; we do NOT depend on being a username authority.
- Useful native pallets available: `scheduler`, `proxy`, `multisig`, `assets`.
- First-party **Python SDK** is the documented tool; `cargo-contract` / polkadot.js are
  the standard ink! toolchain (inferred — confirm versions against a live node).

### Environment risk (must resolve before public deploy)
Portaldot docs publish **no public testnet RPC endpoint or POT faucet**. Plan:
develop against a local `portaldot_dev --dev` node (or `substrate-contracts-node` for
fast iteration); confirm a real testnet endpoint + faucet and the exact ink!/
cargo-contract versions with the Portaldot team before any public deployment.

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
PotRegistrar (.pot)               PublicResolver (upgradeable via set_code_hash)
  • owns the .pot node              addr(node, coinType) · text(node, key)
  • names = PSP-34 NFTs             payment(node) · profile(node) · name(node)
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
- **PotRegistrar** — owns the `.pot` node in the Registry; mints each second-level name
  as a **PSP-34 NFT** (ink!'s ERC-721 equivalent); tracks expiry; runs grace + premium
  auction. Authorizes one or more Controllers.
- **RegistrarController** — public-facing registration policy: commit-reveal, length
  pricing, POT rent collection. Swappable without touching ownership records.
- **PublicResolver** — upgradeable; holds all records, including the three signature
  record types and the reverse `name` record.
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
  lookups at any depth, no on-chain string handling, and small storage footprint
  (important given per-byte storage deposits).
- **NFT identity:** in `PotRegistrar`, PSP-34 token id for a second-level name =
  its `labelhash`. Owning the NFT = owning the registration (the "registrant"). Registry
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
hash is stored on-chain, keeping each record write a bounded, cheap storage deposit.

---

## 5. Registration Lifecycle & Economics

### Commit–reveal (anti-front-running)
```
1. commit(hash)      hash = blake2_256(name ‖ owner ‖ secret)   // name hidden
        wait min_commit_age (~60s) and within max_commit_age
2. register(name, owner, duration, secret, resolver?)
        → Controller verifies commitment + availability,
          collects POT rent for `duration`, then PotRegistrar:
            • mints PSP-34 NFT to owner
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
  `pallet-identity` for the name owner's account; if it has a registrar **judgement**
  (`Reasonable`/`KnownGood`), the profile surfaces a **verified** badge. No username
  authority needed — avoids runtime coupling, scores on "native deployment."
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

- **`cargo-contract`** builds each contract → Wasm + metadata JSON.
- Deploy via `@polkadot/api` scripts + polkadot.js Apps "Contracts" UI for manual checks.
- Develop against local `portaldot_dev --dev` / `substrate-contracts-node`; confirm
  testnet endpoint + faucet + toolchain versions with Portaldot team before public deploy.
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
rent + grace + premium auction; PSP-34 name NFTs; full record set; profile + native
pallet-identity read badge; pay-by-name (POT + assets) with payment requests; subname
issuance with fuses + paid self-mint; TS SDK + reference dApp.

**v2 (deferred):** attestation issuance UI, reputation scoring, streaming payments, open
subname marketplace, USD-peg price oracle, cross-chain/omnichain resolution.

---

## 12. Open Questions / To Confirm

- Public Portaldot **testnet RPC + POT faucet** (not documented).
- Exact **ink! / cargo-contract versions** supported by the live runtime.
- Concrete **fee / storage-deposit values** and existential deposit on Portaldot.
- Whether to peg pricing to USD via an oracle in a later Controller (no documented oracle).
- License choice for open-sourcing core contracts.

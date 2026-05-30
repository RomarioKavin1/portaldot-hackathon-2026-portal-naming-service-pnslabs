# Portal Naming Service (`.pot`) — Project Description

## What it is

Portal Naming Service (PNS) is an ENS-faithful decentralized naming protocol for the **Portaldot** chain. It maps memorable `.pot` names to accounts, records, and profiles entirely on-chain — turning unreadable 48-character SS58 addresses (`5Gg7tZDAPRUyoouUzeM1oo3K4migHxH31gcgXUqLS1AoErcZ`) into human-readable identity (`alice.pot`).

It is built as six native **ink!** smart contracts on a Substrate-based, **non-EVM** chain, with POT as gas. All ownership, records, subnames, and permissions are on-chain state — nothing depends on an off-chain indexer.

## The problem

- SS58 addresses are impossible to read, type, or verify by eye → payment errors and phishing risk.
- On-chain identity is unworkable when every account is an opaque string.
- Every dApp reinvents its own address book; nothing is portable or composable across the ecosystem.

PNS is the Portaldot-native identity primitive that fixes this — the analogue of ENS for Substrate/ink!.

## How it works

PNS follows the ENS data model: every name is a 32-byte `node` (namehash, computed with `blake2_256`), and a central **registry** maps each node to an owner, a resolver, and a TTL. Names are hierarchical — `pay.alice.pot` derives deterministically from `alice.pot` derives from `.pot`.

**Registration (commit–reveal, front-running-resistant):**
1. **Commit** — the user submits a hashed commitment of `(name, owner, secret)`. The hash hides the name, so observers can't snipe it.
2. **Wait** — a commit-age window must elapse (default **60s min, 7 days max**) before reveal.
3. **Register** — the user reveals the name and pays the quoted POT rent. The `registrar_controller` collects payment, routes it to the treasury, and calls the `.pot` registrar to mint label ownership; the registry records owner + resolver for the node.

**Resolution:**
- **Forward** — `resolve(alice.pot)` → namehash → registry resolver → `public_resolver.addr(node)` → owning account (or any multi-coin / text record).
- **Reverse** — an account claims `addr.reverse` via the `reverse_registrar`, sets a primary name, and reverse lookups map the account back to `alice.pot`. Reverse results are **forward-verified** (the claimed name must resolve back to the same account) to defeat spoofing.

**Subnames:** a name owner mints subnames (`pay.alice.pot`) through the `subname_registrar` with a **fuses-lite** permission model — capability flags that can be permanently burned to lock delegated control (e.g. relinquish the right to revoke a subname).

## Technical architecture

```
Next.js dApp ── SDKs (TypeScript / Python) ── polkadot.js RPC ── Portaldot (pallet-contracts, Wasm)
                                                                        │ cross-contract calls
        registry · pot_registrar · registrar_controller · public_resolver · reverse_registrar · subname_registrar
```

**Six ink! contracts (cross-wired):**

| Contract | Role |
|---|---|
| `registry` | Source of truth: `node → owner / resolver / TTL`; `set_subnode_owner` for hierarchy. |
| `pot_registrar` | Owns the `.pot` TLD; custom NFT-style label ownership with expiry + grace period; controller-gated mint/renew/transfer. |
| `registrar_controller` | Public entry point: commit–reveal, length-based pricing, treasury routing, `register`/`renew`/`quote`. |
| `public_resolver` | Records a name points to: multi-coin `addr`, arbitrary `text`, `name`. Owner-gated via the registry. |
| `reverse_registrar` | Account → primary `.pot` name; `claim`/`set_name` with forward-verification. |
| `subname_registrar` | Programmable subnames + fuses-lite permission locking. |

**Stack & engineering:**
- **Contracts:** Rust → Wasm via ink! `3.0.0-rc3`, targeting `pallet-contracts`. Namehash = `blake2_256`, ENS-compatible.
- **Reproducible build:** pinned toolchain (Rust nightly, ink! `3.0.0-rc3`, `cargo-contract` `0.12.1`) in a Docker image, so the Wasm artifact matches the chain runtime byte-for-byte.
- **SDKs:** TypeScript (`portaldot-pns`, published to npm) and Python (`portal_name`) share one canonical namehash + normalization spec, so chain, frontend, and backend agree exactly. Zero-config `connect()` plus custom-RPC support.
- **dApp:** Next.js 14 (App Router) + React 18 + Tailwind, polkadot.js wallet connector; full register / resolve / records / subname / primary-name flows.
- **Scalability:** stateless reads resolve client-side from a single namehash; cross-contract calls keep concerns isolated and independently upgradeable; hierarchical subnames let one registered name fan out to unlimited delegated identities without new top-level registrations.

## Business model & token economics

PNS monetizes through **annual name rent in POT**, priced by name length to balance demand for short names against squatting. Default tiers (per year, governance-adjustable):

| Name length | Tier | Price / year |
|---|---|---|
| 1–2 chars | Premium | **640 POT** |
| 3 chars | High | **160 POT** |
| 4 chars | Medium | **40 POT** |
| 5+ chars | Base | **5 POT** |

- **Rent, not sale:** names are registered for a duration and must be **renewed**; a grace period after expiry protects owners before a name becomes available again. This creates recurring revenue and recycles abandoned names back into supply.
- **Treasury routing:** all collected rent flows to a configurable **treasury** account — fundable for protocol development, ecosystem grants, or community governance.
- **Anti-squat pricing:** length-tiered pricing makes short/premium names expensive while keeping ordinary names cheap (5 POT/yr), aligning incentives toward genuine use.
- **Ecosystem value capture:** as wallets, payment flows, and dApps adopt `.pot` names as the default identity layer, demand for registrations and renewals compounds — and subnames let organizations issue identities (`alice.team.pot`) under a single paid root.

## Why it matters

PNS is the missing identity and naming layer for Portaldot: a reusable on-chain primitive that makes payments safe, profiles portable, and access control composable — the foundation other ecosystem apps build on top of, rather than reinventing.

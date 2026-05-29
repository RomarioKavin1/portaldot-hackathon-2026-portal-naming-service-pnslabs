# Portal Naming Service — Implementation Roadmap

> **For agentic workers:** This is the master roadmap. Each phase below becomes its own
> detailed plan in `docs/superpowers/plans/`. **Plan 0 is fully detailed and executable
> now** (`2026-05-30-phase-0-toolchain-and-scaffolding.md`). Plans 1–4 are outlined here
> and must be written in full detail **only after Plan 0 locks the exact ink! API**,
> because the contract code depends on the verified ink! version.

**Goal:** Build the Portal Naming Service (`.pot`) end-to-end on Portaldot — five ink!
contracts, a TS (+thin Python) SDK, and a Next.js reference dApp.

**Source spec:** `docs/superpowers/specs/2026-05-30-portal-naming-service-design.md`

**Why phased:** the v1 scope spans independent subsystems, and the contract toolchain is
~2021-era and unverified (spec 1002, metadata V13, rent-era `pallet-contracts`). Plan 0
removes that risk before any contract code is written.

---

## Dependency graph

```
Plan 0  Toolchain + scaffolding + flipper deploy + cross-contract probe
   │   (GATE: locks ink!/cargo-contract version + proves cross-contract calls)
   ▼
Plan 1  Core: Registry → PotRegistrar → RegistrarController (register a name)
   │
   ▼
Plan 2  PublicResolver + ReverseRegistrar + SubnameRegistrar (records, reverse, subnames)
   │
   ├────────────► Plan 3  SDK (TS primary + thin Python) — depends on deployed contracts
   │                         │
   ▼                         ▼
   └──────────────────► Plan 4  Next.js + React + polkadot.js reference dApp (uses SDK)
```

Plan 3 can begin as soon as Plan 1 contracts are deployable (resolve/register surface);
Plan 4 depends on Plan 3.

---

## Plan 0 — Toolchain Verification & Scaffolding  ✅ DETAILED

See `2026-05-30-phase-0-toolchain-and-scaffolding.md`. Outcome: a reproducible build
toolchain, a flipper contract deployed to the dev node, verified cross-contract
call/instantiation, and the monorepo scaffold. **Hard gate** for all contract work.

---

## Plan 1 — Core Contracts (outline — detail after Plan 0)

**Produces:** a name can be registered and its owner/resolver looked up on-chain.

Contracts & key responsibilities (per spec §3):
- `registry` — `Mapping<Node,{owner,resolver,ttl}>`; `set_owner`, `set_resolver`,
  `set_subnode_owner`, `owner()`, `resolver()`. Blake2_256 namehash helper.
- `pot_registrar` — owns the `.pot` node; custom ownership map (`Mapping<labelhash,owner>`
  + `transfer`/`approve`); expiry tracking; grace + premium auction; authorizes controllers.
- `registrar_controller` — commit–reveal (`commit`, `register`), length-based POT pricing,
  rent collection, `renew`.

Representative task groups (TDD, `#[ink::test]` first):
1. `registry`: node/labelhash helpers + property tests for namehash determinism.
2. `registry`: ownership + resolver mappings with access control.
3. `registry`: subnode ownership.
4. `pot_registrar`: ownership map + transfer/approve.
5. `pot_registrar`: register/expiry/renew; grace-period state machine.
6. `pot_registrar`: premium Dutch-auction price curve (pure function + tests).
7. `registrar_controller`: commit–reveal with min/max commit age.
8. `registrar_controller`: pricing tiers + rent payment in POT.
9. Cross-contract wiring: controller → registrar → registry (uses Plan 0's verified
   cross-contract mechanism).
10. Deploy script extends `scripts/` to deploy the three contracts in order and wire them.

**Open inputs:** concrete POT price tiers (default proposed in the plan), grace/auction
window lengths.

---

## Plan 2 — Resolver, Reverse, Subnames (outline)

**Produces:** records (addr/text/payment/profile), address→name reverse resolution, and
programmable subname issuance.

Contracts:
- `public_resolver` — `addr(node,coinType)`, `text(node,key)`, `payment(node)`,
  `profile(node)`, `name(node)`; per-node owner-gated writes (checks Registry owner).
- `reverse_registrar` — `claim()`, `set_name()`; manages `<addr>.addr.reverse`.
- `subname_registrar` — `mint_subname` with burn-only fuse bitfield
  (`CANNOT_TRANSFER`, `CANNOT_SET_RESOLVER`, `CANNOT_EDIT_RECORDS`, `PARENT_CANNOT_CONTROL`);
  expiry ≤ parent; optional per-subname price + protocol fee.

Representative task groups: record getters/setters with auth (TDD); reverse claim + the
**forward-verification** contract-side guard where feasible; subname mint + fuse-burn state
machine + emancipation invariant; deploy script wiring resolver as default.

---

## Plan 3 — SDK (outline)

**Produces:** `@portal-name/sdk` (TypeScript) + thin Python wrapper.

- TS (`@polkadot/api` + `@polkadot/api-contract`), with **legacy V13 metadata handling**:
  `normalize(name)` (ENSIP-15-style), `namehash`, `resolve(name)`, `reverse(address)`
  (with mandatory forward-verification), `resolvePayment(name)`, `commit()`/`register()`,
  record read/write helpers.
- Vitest unit tests for `normalize`/`namehash` (pure); integration tests for
  resolve/reverse/register against the dev node (seeded by Plan 1/2 deploy scripts).
- Thin Python wrapper over `substrate-interface` mirroring resolve/reverse/register
  (reuses `scripts/` chain helpers from Plan 0).

---

## Plan 4 — Next.js Reference dApp (outline)

**Produces:** a working web dApp (Next.js + React + polkadot.js extension).

Screens: search/availability → commit-reveal register (UI handles the wait window) →
manage records → set primary (reverse) name → pay-by-name (QR/link) → issue & configure
subnames. Wallet connect via `@polkadot/extension-dapp`. All chain access through the
Plan 3 SDK. Playwright happy-path e2e against the dev node.

---

## Cross-cutting conventions (all plans)

- **TDD**, frequent commits, exact file paths, complete code in each step.
- Commit messages: **no Claude co-author trailer** (user preference).
- All core contracts open-source (hackathon requirement).
- Every contract change re-runs `#[ink::test]` unit tests before commit; deploy scripts are
  idempotent and re-seed after the dev node's state reset.

---

## Inputs still needed from the node operator (philotheephilix)

These feed Plan 0 Task 1 and are the only true blockers to detailing Plans 1–4:
1. polkadot-sdk/Substrate version of the runtime (seen: spec 1002, metadata V13, rent-era).
2. Exact ink! + cargo-contract version (+ a known-good flipper build, if any).
3. Rust nightly + wasm-opt/binaryen versions.
4. Is `pallet-contracts` instantiation open to normal accounts or sudo-gated?
5. Availability of a non-resetting testnet for development/demo.
6. Any faucet beyond the `//Alice` drip.

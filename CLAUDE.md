# CLAUDE.md — Portal Naming Service

Guidance for AI sessions working in this repo. **Read `HANDOFF.md` first** for current
status; this file is the stable orientation.

## What this is
An ENS-style decentralized naming service (`.pot` names) for the **Portaldot** chain,
built as **ink! smart contracts** + a TypeScript/Python SDK + a Next.js dApp. It maps
`alice.pot` → account + records, and adds: on-chain profile/identity, name-based payments,
and programmable subnames. Full design: `docs/superpowers/specs/2026-05-30-portal-naming-service-design.md`.
Plans: `docs/superpowers/plans/`.

## Current status (2026-05-30)
Design + plan complete. Chain and toolchain identity verified. **Blocked** on building a
2021-era ink! contract in 2026 (see `HANDOFF.md` + `docs/toolchain.md`). Do not redo the
investigation — the facts below are settled.

## Hard-won facts (don't re-derive)
- **Portaldot = Substrate 3.0.0 fork.** spec 1002, metadata **V13**, `pallet-contracts`
  3.0.0 (rent-era: `claim_surcharge`, `instantiate_with_code`, NO storage deposits / NO
  Weight V2 / NO upload_code). **Non-EVM.** SS58 prefix 42. POT = 14 decimals. ED = 1 POT.
- **Contract toolchain:** Rust `nightly-2021-03-01`, ink! `3.0.0-rc3`, cargo-contract
  `0.12.1`, seal0 ABI, metadata v0. (Source: github.com/portaldotVolunteer/Portaldot,
  built by "fengsong".)
- **The docs lie about versions:** readthedocs examples show a *modern* runtime (Weight V2,
  storage deposits) that does NOT match the live chain. Trust the source repo, not the docs.
- **Build blocker:** cargo-contract 0.12's `-Zbuild-std` re-resolves deps against today's
  crates.io → pulls `edition2021` crates rustc 1.52 can't parse. Pins/lock/vendor don't
  constrain build-std. Native macOS build is impossible (Xcode 26 linker rejects 2021 rlibs)
  → must use Docker (`docker/Dockerfile.contracts`, image `pns-ink-build`).
- **Endpoints/faucet:** `rpc.md`. Dev node `wss://portaldot.philotheephilix.in` is the
  user's friend's node and **resets on restart**. Mainnet `wss://mainnet.portaldot.io` (same runtime).

## Architecture (planned)
Five ink! contracts, ENS-faithful: `registry` (node→owner+resolver), `pot_registrar`
(.pot allocation, custom NFT-style ownership — NOT PSP-34, which needs ink! 4.x),
`registrar_controller` (commit-reveal + length pricing in POT), `public_resolver`
(addr/text/payment/profile/name records), `reverse_registrar`, `subname_registrar`
(fuses-lite). Blake2_256 namehash. Build/verify via the Phase 0 plan first.

## What works
- `scripts/*.py` (Python `substrate-interface==1.7.4`): connect + faucet, verified live.
  Always pass `ss58_format=42` and `type_registry_preset='substrate-node-template'` (pre-V14).
- `pns-ink-build` Docker image (bookworm + nightly-2021-03-01 + cargo-contract 0.12.1).

## Working conventions (user preferences)
- **Git commits:** NO `Co-Authored-By: Claude` trailer. Plain messages.
- **Docker:** do NOT run `open -a Docker` yourself — ask the user to start it.
- **Homebrew:** never `brew uninstall`/`autoremove` without explicit per-command consent —
  it cascaded and removed 65 formulae once (`docs/brew-restore-list.md`).
- Build attempts are slow (x86 emulation) — run them with `run_in_background: true`.

## Conventions for code (when unblocked)
- TDD, frequent commits, small focused files. ink! `#[ink::test]` unit tests per contract.
- Contracts target ink! 3.0.0-rc3 syntax (`ink_lang as ink`, split `ink_*` crates) — NOT
  ink! 4.x/5.x. Pin every ink crate to `=3.0.0-rc3`.

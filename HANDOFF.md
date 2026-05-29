# Portal Naming Service — Handoff (2026-05-30)

Checkpoint of where things stand. The design and planning are complete; the project is
blocked on one thing: resurrecting the **2021-era ink! build toolchain** in 2026.

## TL;DR
- **What it is:** an ENS-style `.pot` naming service for the Portaldot chain (ink! contracts
  + TS/Python SDK + Next.js dApp). Full design in `docs/superpowers/specs/`, plans in
  `docs/superpowers/plans/`.
- **Status:** design ✅, plan ✅, chain + toolchain identity verified ✅, build env 90% ✅.
  **Blocked** building a contract because cargo-contract 0.12's `-Zbuild-std` re-resolves
  deps against today's crates.io and pulls `edition2021` crates that rustc 1.52 can't parse.
- **Best unblock:** get the working build environment (or a prebuilt `.contract`) from the
  Portaldot node author (**fengsong**), who necessarily has one.

## Verified facts (do not re-derive)
- **Chain:** Portaldot, spec 1002, metadata **V13**, rent-era `pallet-contracts` 3.0.0
  (`claim_surcharge`, `instantiate_with_code`, **no** storage deposits / Weight V2 / upload_code).
  Non-EVM. SS58 prefix 42. POT, 14 decimals. ExistentialDeposit 1 POT.
  Mainnet and dev node run the **identical** runtime.
- **Source:** github.com/portaldotVolunteer/Portaldot (Substrate 3.0.0 fork; built by
  "fengsong"). Release binaries: github.com/portaldotVolunteer/Portaldot-node.
- **Toolchain (from the source repo):** Rust **nightly-2021-03-01**, ink! **3.0.0-rc3**,
  cargo-contract **0.12.1**, seal0 ABI, metadata v0. Confirmed by the first-party SDK
  (`DeveloperPlatform/sdk_interface/contracts.py` parses metadata version 0).
- **Endpoints / faucet:** see `rpc.md`. Dev node `wss://portaldot.philotheephilix.in`
  (hosted by the user's friend; resets state on restart). `//Alice` is Sudo + faucet master.

## What works right now
- `scripts/` (Python `substrate-interface==1.7.4`): `check_connection.py` → CONNECTION OK;
  `faucet.py` → drips POT (verified live). `chain.py` helpers (connect/alice/new_account).
- **Docker image `pns-ink-build`** (≈2.5 GB, kept locally) built from
  `docker/Dockerfile.contracts`: Debian bookworm + nightly-2021-03-01 + wasm target +
  rust-src + **cargo-contract 0.12.1** + binaryen. `cargo contract new flipper` works and
  pins ink! 3.0.0-rc3.
- `contracts/flipper/` — generated ink! rc3 flipper, with `Cargo.toml` deps pinned exactly
  to `=3.0.0-rc3` (+ `impl-trait-for-tuples = "=0.2.1"`).

## The blocker (precisely diagnosed)
`cargo contract build` runs:
`cargo build --target=wasm32-unknown-unknown -Zbuild-std -Zbuild-std-features=panic_immediate_abort ...`
`-Zbuild-std` re-resolves the whole dependency graph against the live crates.io index,
pulling 2024 crates (`either 1.16.0`, `crossbeam-deque 0.8.6`, `impl-trait-for-tuples 0.2.2`,
`ink_prelude 3.4.0`…) that require `edition2021` — which rustc 1.52 (nightly-2021-03-01)
cannot parse. Tried and insufficient: exact `=` pins, `-Z minimal-versions` lockfile
(correctly pinned `either` to 1.5.0 but build-std ignored the lock), and `cargo vendor` +
crates-io source-replacement (build-std re-resolution bypassed it).

Earlier dead end: native macOS build is impossible — Xcode 26 / `ld-1230` rejects 2021
Rust rlibs (`lib.rmeta not a mach-o file`); `-ld_classic` no longer helps. Hence Docker.

## Options to unblock (pick one)
1. **Ask fengsong / Portaldot team** for their ink! 3.0.0-rc3 build env (Docker image or
   cargo cache) or any prebuilt `flipper.contract` + `.wasm`. Fastest, most reliable.
2. **Freeze the crates.io index to ~2021-05** (replace `[source.crates-io]` with a
   crates.io-index git checkout at a 2021 commit) so build-std also only sees 2021 crates.
   Correct technical fix; heavy (multi-GB index, x86 emulation).
3. **Disable build-std** (build the contract against the precompiled wasm32 std) if
   cargo-contract 0.12 / ink! rc3 can be coaxed to — would stop the re-resolution.

## Next steps once a contract builds
Resume Plan 0 at deploy: `scripts/` deploy via `substrate-interface` `ContractCode`
(`instantiate_with_code`, old u64 `gas_limit`, `endowment`/`value=0`, `upload_code=True`) →
verify get→flip→get → **cross-contract probe** (the architecture gate for the 5-contract
design). Then write detailed Plans 1–4 (core contracts → resolver/reverse/subnames → SDK →
dApp). See `docs/superpowers/plans/2026-05-30-portal-naming-service-roadmap.md`.

## Repo map
- `docs/superpowers/specs/2026-05-30-portal-naming-service-design.md` — full design spec
- `docs/superpowers/plans/` — roadmap + detailed Phase 0 plan
- `docs/toolchain.md` — verified toolchain + build-environment findings
- `docs/brew-restore-list.md` — list to restore 65 Homebrew formulae removed by an
  accidental `brew autoremove` during cleanup (run the `brew install` there if tools broke)
- `rpc.md` — node endpoints, accounts, faucet
- `scripts/` — Python chain ops (verified working)
- `docker/Dockerfile.contracts` — the build image
- `contracts/flipper/` — ink! rc3 flipper (Cargo.toml pinned)

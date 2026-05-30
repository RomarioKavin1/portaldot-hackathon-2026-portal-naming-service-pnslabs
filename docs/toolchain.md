# Portaldot Contract Toolchain — Verified Recipe

> Fill the "Answer" column from the node operator (philotheephilix), then verify by
> completing Phase 0. Until verified, treat defaults as "best estimate from recon".

## Recon facts (verified by WebSocket probe 2026-05-30)
- spec_name=portaldot, spec_version=1002, node 2.0.0-unknown
- Metadata **V13** (pre-V14)
- `pallet-contracts` calls: call, instantiate_with_code, instantiate, **claim_surcharge**
  → rent-era pallet
- No storage deposits, old u64 Weight, SS58 prefix 42, POT 14 decimals, ED = 1 POT
- Zero contracts currently deployed on-chain

## Authoritative source (node built from public source repo)
The node is `portaldot_dev` built from **github.com/portaldotVolunteer/Portaldot** (a
Substrate **3.0.0** monorepo fork; release binaries in `.../Portaldot-node`). Verified by
reading that repo on 2026-05-30:
- **Substrate / FRAME 3.0.0** — `sp-core 3.0.0`, `frame-support 3.0.0`,
  **`pallet-contracts` 3.0.0** (`frame/contracts/Cargo.toml`).
- Contracts ABI = **`seal0`** (+ a few `seal1`), `InstructionWeights` v2, `wasmi 0.9`,
  `pwasm-utils 0.18`, `parity-scale-codec 2.1.1`.
- **Rust toolchain: `nightly-2021-03-01`** + `wasm32-unknown-unknown` (`shell.nix`).
- Built by "fengsong"; node crate `node-cli 2.0.0`.
- Confirms: rent-era `instantiate_with_code`, no `upload_code`/storage-deposits/Weight V2.

### Corroboration from the first-party Python SDK (`DeveloperPlatform/sdk_interface/contracts.py`)
- Parses **metadata version 0** (the top-level `metadataVersion` key) — the format **ink!
  3.0.0-rc** emitted in early 2021. Docstring references `cargo +nightly contract
  generate-metadata` (an old cargo-contract subcommand). → contract side = ink! 3.0.0-rc +
  cargo-contract ~0.11–0.12.
- ⚠️ The **readthedocs examples are written for a NEWER runtime** than the live node: they
  use Weight-V2 gas (`gas_limit={'ref_time':…, 'proof_size':…}`) and
  `type_registry_preset='default'`. For THIS node use **old single-integer u64
  `gas_limit`** (e.g. `1_000_000_000_000`) and preset `substrate-node-template`.
- Deploy path confirmed: `substrate-interface` `ContractCode.create_from_contract_files()`
  → `code.deploy(constructor="new", args=..., gas_limit=<u64>, upload_code=True)`.
- No prebuilt flipper artifact exists in any Portaldot repo (no build-free shortcut).

## Questions → Answers
| # | Question | Answer (✅ = verified) |
|---|----------|------------------------|
| 1 | Substrate version | ✅ **3.0.0** (Feb 2021), pallet-contracts 3.0.0 |
| 2 | ink! version | **3.0.0-rc1 / rc2** (spring-2021 line; exact rc to confirm by build) |
| 3 | cargo-contract version | **0.11.x / 0.12.x** (to confirm by build) |
| 4 | Rust nightly | ✅ **nightly-2021-03-01** (`shell.nix`) |
| 5 | wasm-opt/binaryen | binaryen ~99–101 (estimate) |
| 6 | Instantiation gating | General signed extrinsics open (faucet works); `pallet-contracts` instantiation untested |
| 7 | Non-resetting testnet | Node runs in `--dev` (state resets on restart); mainnet `wss://mainnet.portaldot.io` persists |
| 8 | Faucet | `//Alice` drip (Sudo+faucet master); PortalFlow app API (see `rpc.md`) |

## Build-environment finding (2026-05-30) — native macOS build is BLOCKED
- `nightly-2021-03-01` (rustc 1.52) installs fine on arm64, but **cannot link on this
  machine**: Xcode 26.1.1 / `ld-1230` rejects the toolchain's 2021 `.rlib` archives with
  `archive member 'lib.rmeta' ... is not mach-o or llvm bitcode file`. Even a trivial
  hello-world fails; `-ld_classic` is now a thin alias on `ld-1230` and still errors.
- Therefore `cargo install cargo-contract 0.12.1` fails at link time (`crc32fast`, build
  scripts, etc.). Confirmed empirically.
- **Conclusion: build contracts on Linux (Docker)** where GNU `ld` doesn't perform this
  mach-o member validation. Native macOS would require an alternative linker (Homebrew
  `lld`/`ld64.lld`) and is unverified.

## Docker build blocker (2026-05-30) — "2021 ink! vs 2026 crates.io"
The `pns-ink-build` image works: nightly-2021-03-01 + cargo-contract 0.12.1 + binaryen;
`cargo contract new flipper` pins ink! 3.0.0-rc3. But **building the flipper fails**:
- `cargo contract build` runs
  `cargo build --target=wasm32-unknown-unknown -Zbuild-std -Zbuild-std-features=panic_immediate_abort --no-default-features --release`.
- **`-Zbuild-std` re-resolves the whole dep graph against today's crates.io** and pulls
  2024 crates needing `edition2021` (`ink_prelude 3.4.0`, `impl-trait-for-tuples 0.2.2`,
  `crossbeam-deque 0.8.6`, `either 1.16.0`, …) that rustc 1.52 cannot parse.
- Tried & insufficient: exact `=3.0.0-rc3` pins on all ink crates; `-Z minimal-versions`
  lockfile (pinned e.g. `either 1.5.0` but build-std ignored the lock); `cargo vendor` +
  crates-io **source replacement** (build-std's resolution bypassed it, still hit crates.io).
- **Bypassing build-std does NOT work**: a plain `cargo build --target wasm32
  --no-default-features` (no build-std, precompiled wasm std) gets past resolution but
  fails to link — ink! contracts are `#![no_std]` and define their own `panic_impl`, which
  collides with the precompiled `libstd` that gets linked (`E0152` duplicate lang item, via
  `arrayref`→std). **ink! contracts require `-Zbuild-std`.**
- `-Z minimal-versions` also picks some **too-OLD** crates that don't compile on rustc 1.52
  (`void` 1.0.0 → pin `=1.0.2`; `wee_alloc` → pin `=0.4.5`; both captured in
  `contracts/flipper/Cargo.toml`). So the dep set must be *period-correct* (mid-2021), not
  minimal and not newest.

### Only robust local fix: freeze the crates.io index to ~2021
Because build-std re-resolves against the live index and ignores lock + project-local
source replacement, the fix must constrain the **index itself, globally**: set
`$CARGO_HOME/config.toml` (`/root/.cargo/config.toml`, NOT the project) to replace
`[source.crates-io]` with a `git+https://github.com/rust-lang/crates.io-index?rev=<2021-04
commit>`. Heavy (multi-GB index fetch under x86 emulation) and unverified that
cargo-contract's build-std honors even the global config. **Recommended instead: obtain
fengsong's working ink! 3.0.0-rc3 build env (Docker image / cargo cache) or a prebuilt
`.contract`** — they built and deployed this runtime, so they have one.

## Verified recipe (fill after Phase 0 build passes)
- Build command:
- Deploy command:
- Exact ink! / cargo-contract that produced a deployable contract:
- Cross-contract call supported? (yes/no):
- Cross-contract instantiation supported? (yes/no):

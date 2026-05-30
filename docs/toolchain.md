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

## Verified recipe (Phase 0 — runtime side)

The ink! build env remains blocked (see Build-environment finding above and
HANDOFF.md). However, the *Portaldot runtime side* of Phase 0 is fully
verified by deploying raw seal0-ABI `.wat` fixtures from `frame/contracts/fixtures/`
of the Portaldot source repo — they ship as test inputs to pallet-contracts
3.0.0 itself and use the same `seal_*` host ABI any built ink! 3.0.0-rc3
artifact will use, so verifying them on this runtime de-risks the deploy /
call / cross-contract mechanic without needing the ink! toolchain.

### Verified by live deployment 2026-05-30 (block ~2716+)
- **Deploy path:** raw extrinsic `Contracts.instantiate_with_code{ endowment,
  gas_limit, code, data, salt }` via `substrate-interface 1.7.4`, signed by
  `//Alice`. **No sudo required** (instantiation open to normal accounts).
  Endowment = 10 POT (10 * 10^14 planck), gas_limit = 5*10^11 (old u64
  Weight), fee ≈ 0.024 POT per instantiate, ≈ 0.012 POT per call.
- **Address discovery:** consume `Contracts.Instantiated(deployer, contract)`
  event from the receipt's `triggered_events`. (`Contracts.CodeStored(hash)`
  event also emitted on first deploy of a given codehash.)
- **Call path:** `Contracts.call{ dest, value, gas_limit, data }`. Outer
  `dest` is `LookupSource = MultiAddress` (substrate-interface auto-wraps
  bare SS58 as `MultiAddress::Id(AccountId)`).
- **Outcome modes (proven against `ok_trap_revert.wat`):**
  - input `[0]` → contract returns naturally → extrinsic `is_success=True`
  - input `[1]` → contract calls `seal_return(flags=1, …)` → extrinsic
    `is_success=True` with **silent internal revert** (pallet-contracts
    3.0.0 does NOT surface contract `flags=1` as a dispatch error)
  - input `[2]` → contract hits `unreachable` → extrinsic
    `is_success=False`, error name **`ContractTrapped`**
- **Cross-contract call works** (architecture gate for the 5-contract design
  is GREEN). Verified by `probe_caller.wat` → `ok_trap_revert.wat`,
  exit-code-asserted for all three callee branches.
- **`seal_call` SCALE-decode rules** (Portaldot pallet-contracts 3.0.0,
  `frame/contracts/src/wasm/runtime.rs` line 688–690 — read verbatim, NOT
  guessed):
  - `callee_ptr/_len` → decoded as raw `AccountId32` = **32 bytes** (NOT
    `MultiAddress`; the MultiAddress wrap exists only on the outer
    extrinsic).
  - `value_ptr/_len` → decoded as `BalanceOf<T> = u128` = **16 bytes**
    little-endian (Portaldot uses u128 Balance; pallet-contracts' own test
    runtime uses `u64` Balance and its bundled `caller_contract.wat`
    fixture passes `value_len=8` — that fixture is wrong for real-world
    u128 runtimes).
  - `input_data_ptr/_len` → raw bytes (no SCALE decode).
- **`seal_return` SCALE-decode rule:** at the extrinsic boundary,
  pallet-contracts 3.0.0 SCALE-decodes the contract's return payload — so a
  `call`-exported function that calls `seal_return(flags=0, ptr, len>0)`
  with arbitrary bytes will fail dispatch with `DecodingFailed`. Safe
  success path = let the function fall through naturally (no `seal_return`).

### Verified deploy command
```bash
# (run from repo root)
. .venv/bin/activate
cd scripts
python3 deploy_fixture.py fixtures/<name>.wasm [<salt_hex>]
```
Produces `<name>_address.txt` consumed by `call_fixture.py` /
`probe_cross_contract.py`.

### Reproducible build of .wat fixtures
```bash
brew install wabt           # wat2wasm 1.0.41
cd scripts/fixtures
wat2wasm <name>.wat -o <name>.wasm
```
Note: original `caller_contract.wat` from the Portaldot repo uses pre-MVP
syntax (`get_local`/`set_local`); modernize with a regex pass
(`get_local` → `local.get`, etc.) before `wat2wasm`. Our `probe_caller.wat`
is hand-written in modern syntax.

### Still blocked — ink! source build
Building actual ink! 3.0.0-rc3 contracts (the PNS five) remains blocked on
`cargo-contract 0.12`'s `-Zbuild-std` re-resolving the dep graph against
today's crates.io and pulling `edition2021` crates that rustc 1.52 can't
parse. Options outlined in HANDOFF.md. The runtime-side verification above
removes the *deploy-mechanic* unknown so that work can resume immediately
once any path to a deployable `.wasm + metadata.json` opens (fengsong's
build env, a frozen 2021-05 crates.io index mirror, or a
`-Zbuild-std`-free build mode).

### Build / deploy summary
| Stage | Status | Notes |
|-------|--------|-------|
| ink! 3.0.0-rc3 source build | 🔴 blocked | build-std re-resolution; see HANDOFF.md |
| Substrate-interface deploy from raw `.wasm` | ✅ verified | `instantiate_with_code`, normal account |
| Substrate-interface call | ✅ verified | three outcomes confirmed |
| Cross-contract call | ✅ verified | architecture gate for PNS five-contract design |
| Cross-contract instantiate | ⚠️ not verified | not needed for v1 (call-only wiring is sufficient) |

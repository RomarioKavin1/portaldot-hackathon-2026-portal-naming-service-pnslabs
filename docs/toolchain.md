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

## Verified recipe (fill after Phase 0 build passes)
- Build command:
- Deploy command:
- Exact ink! / cargo-contract that produced a deployable contract:
- Cross-contract call supported? (yes/no):
- Cross-contract instantiation supported? (yes/no):

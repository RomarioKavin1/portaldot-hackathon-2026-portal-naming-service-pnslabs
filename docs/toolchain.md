# Portaldot Contract Toolchain — Verified Recipe

> Fill the "Answer" column from the node operator (philotheephilix), then verify by
> completing Phase 0. Until verified, treat defaults as "best estimate from recon".

## Recon facts (verified by WebSocket probe 2026-05-30)
- spec_name=portaldot, spec_version=1002, node 2.0.0-unknown
- Metadata **V13** (pre-V14)
- `pallet-contracts` calls: call, instantiate_with_code, instantiate, **claim_surcharge**
  → rent-era pallet, ~mid-2021
- No storage deposits, old u64 Weight, SS58 prefix 42, POT 14 decimals, ED = 1 POT
- Zero contracts currently deployed on-chain

## Questions → Answers
| # | Question | Default (estimate) | Answer |
|---|----------|--------------------|--------|
| 1 | polkadot-sdk/Substrate version | ~polkadot-v0.9.7 (mid-2021) | |
| 2 | ink! version | 3.0.0-rc1 | |
| 3 | cargo-contract version | 0.13.x | |
| 4 | Rust nightly | nightly-2021-09-01 | |
| 5 | wasm-opt/binaryen version | binaryen 101 | |
| 6 | Is instantiation open to normal accounts or sudo-gated? | unknown | |
| 7 | Non-resetting testnet available? | unknown | |
| 8 | Faucet beyond //Alice drip? | unknown | |

## Verified recipe (fill after Phase 0 passes)
- Build command:
- Deploy command:
- Cross-contract instantiation supported? (yes/no):

# 🌀 PortalDot Hackathon 2026 — Portal Naming Service

### Project Name

**Portal Naming Service (`.pot`)** — Human-readable identity for the Portaldot chain.

[![npm](https://img.shields.io/npm/v/portaldot-pns.svg)](https://www.npmjs.com/package/portaldot-pns) · TypeScript SDK on npm: [`portaldot-pns`](https://www.npmjs.com/package/portaldot-pns)

## Project Overview

- **Problem Statement:** Portaldot accounts are 48-character SS58 strings (`5Gg7tZDAPRUyoouUzeM1oo3K4migHxH31gcgXUqLS1AoErcZ`). They are impossible to read, type, or verify by eye, which makes payments error-prone and on-chain identity unworkable. Every dApp reinvents its own address book; nothing is portable or composable across the ecosystem.

- **Solution:** An ENS-faithful naming protocol for Portaldot. Portal Naming Service maps memorable `.pot` names to accounts, records, and profiles entirely on-chain:
  - **Forward resolution** — `alice.pot` → account + address records.
  - **Reverse resolution** — account → primary `.pot` name, with forward-verification to prevent spoofing.
  - **Commit–reveal registration** — front-running-resistant name allocation with length-based annual pricing in POT.
  - **Rich records** — multi-coin address records, arbitrary text records, and on-chain profile/identity.
  - **Programmable subnames** — owners mint subnames (`pay.alice.pot`) with a fuses-lite permission model that can permanently lock delegated control.
  - **Two first-class SDKs** — TypeScript and Python clients with identical `blake2_256` namehash vectors, plus a reference Next.js dApp.

- **Blockchain Relevance:** Decentralized identity (DID) and naming primitive built as native **ink! smart contracts** on a non-EVM Substrate chain. Names, ownership, records, and permissions are all on-chain state; nothing depends on an off-chain indexer. The protocol is the Portaldot-native analogue of ENS and underpins name-based payments, profiles, and access control for the wider ecosystem.

### Technical Architecture

```
                            ┌───────────────────────────────┐
                            │      Next.js Reference dApp     │
                            │  search · register · resolve    │
                            │  records · subnames · profile    │
                            └───────────────┬─────────────────┘
                                            │
                       ┌────────────────────┴────────────────────┐
                       │             Client SDKs                   │
                       │   TypeScript (portaldot-pns)  ·  Python   │
                       │   namehash · normalize · resolve · tx     │
                       └────────────────────┬────────────────────┘
                                            │  JSON-RPC (polkadot.js)
                            ┌───────────────┴───────────────┐
                            │        Portaldot chain          │
                            │   pallet-contracts · Wasm       │
                            └───────────────┬───────────────┘
                                            │  cross-contract calls
   ┌──────────────┬──────────────┬──────────┴───────┬──────────────┬──────────────┐
   │   registry   │ pot_registrar│ registrar_       │ public_      │ reverse_     │
   │ node→owner+  │ .pot label   │ controller       │ resolver     │ registrar    │
   │ resolver+ttl │ ownership +  │ commit-reveal +  │ addr/text/   │ addr→name +  │
   │  (the root)  │ expiry       │ POT pricing      │ name records │ verification │
   └──────────────┴──────────────┴──────────────────┴──────────────┴──────┬───────┘
                                                                           │
                                                              ┌────────────┴───────┐
                                                              │ subname_registrar  │
                                                              │ subnames + fuses   │
                                                              └────────────────────┘
```

**Core tech stack**

- **Blockchain platform:** Portaldot — a Substrate-based, Rust-first, **non-EVM** chain. POT is the native gas token (14 decimals, SS58 prefix 42).
- **Smart contract language:** **ink!** (Rust → Wasm), compiled to `pallet-contracts` bytecode. Namehashing uses `blake2_256`, matching ENS semantics.
- **Frontend framework:** **Next.js 14** (App Router) + **React 18** + **TypeScript** + **Tailwind CSS**.
- **Chain connectivity:** **polkadot.js** (`@polkadot/api`, `@polkadot/util-crypto`) and the `@polkadot/extension-dapp` wallet connector.
- **SDKs:** TypeScript (`portaldot-pns`, published to npm) and Python (`portal_name`), sharing one canonical namehash + normalization spec.

### Smart Contracts

Six ENS-faithful ink! contracts under `contracts/`. Each is a standalone crate with its own `lib.rs`.

| Contract | Directory | Role & key messages |
|---|---|---|
| **Registry** | `contracts/registry` | The single source of truth: maps each `node` (namehash) → owner, resolver, TTL. `owner`, `resolver`, `record`, `exists`, `set_owner`, `set_resolver`, `set_subnode_owner`. The root from which all names hang. |
| **POT Registrar** | `contracts/pot_registrar` | Owns the `.pot` top-level domain. Custom NFT-style label ownership with expiry and grace period. `owner_of`, `available`, `expires`, `registration`, `balance_of`; controller-gated mint/renew/transfer. |
| **Registrar Controller** | `contracts/registrar_controller` | Public registration entry point. Front-running-resistant **commit–reveal** plus length-based annual pricing. `commit`, `register`, `renew`, `quote`, `price_per_year`, `set_prices`, `set_commit_age_window`, treasury routing. |
| **Public Resolver** | `contracts/public_resolver` | Stores the records a name points to. `addr`/`set_addr` (multi-coin), `text`/`set_text` (arbitrary key/value), `name`/`set_name`. Owner-gated via the registry. |
| **Reverse Registrar** | `contracts/reverse_registrar` | Primary-name resolution: account → `.pot` name. `claim`, `set_name`, `node_for`, with forward-verification to defeat spoofing. |
| **Subname Registrar** | `contracts/subname_registrar` | Programmable subnames with a **fuses-lite** permission model. `mint_subname`, `burn_fuses` (permanently lock delegated capabilities), `subname`, `fuses_burned`. |

**Deployment**

Build, instantiate, and wire all six contracts with the recipe in **`BUILD_AND_DEPLOY.md`** (prerequisites → build → instantiate → cross-contract wiring → verify). Deployed contract addresses are tracked in `scripts/pns_addresses.json` and consumed by both the SDK presets (`packages/sdk-ts/src/networks.ts`) and the dApp (`app/.env.local`).

The ink! toolchain is pinned (Rust nightly, ink! `3.0.0-rc3`, `cargo-contract` `0.12.1`) and runs inside the reproducible `docker/Dockerfile.contracts` image (`pns-ink-build`) so the Wasm artifact matches the chain's `pallet-contracts` runtime exactly. Full rationale and the validated build flags are documented in `BUILD_AND_DEPLOY.md` and `docs/toolchain.md`.

### Installation & Setup

#### Requirements

- **Node.js** ≥ 18 and **pnpm** (workspace manager)
- **Python** ≥ 3.9 (for the Python SDK and operational scripts)
- **Docker** (for the pinned ink! contract build image)
- A Polkadot.js-compatible browser wallet for the dApp

#### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/RomarioKavin1/PortalNamingService.git
   cd PortalNamingService
   ```

2. **Install dependencies**

   ```bash
   pnpm install                              # JS/TS workspace (SDK + dApp)
   pip install -e packages/sdk-py            # Python SDK
   ```

3. **Compile & deploy the contracts**

   Build the Wasm artifacts, then deploy and wire them to the Portaldot network:

   ```bash
   # build all six ink! contracts in the pinned toolchain image
   docker build -t pns-ink-build -f docker/Dockerfile.contracts .
   # full build → instantiate → wire → verify recipe:
   #   see BUILD_AND_DEPLOY.md
   ```

   Deployed addresses are written to `scripts/pns_addresses.json`.

4. **Launch the frontend** *(optional)*

   ```bash
   cd app
   cp .env.local.example .env.local          # point at your deployed addresses
   pnpm dev                                  # http://localhost:3000
   ```

#### Using the SDK

The TypeScript SDK is published on npm: **[`portaldot-pns`](https://www.npmjs.com/package/portaldot-pns)**.

```bash
npm install portaldot-pns
```

```ts
import { connect } from "portaldot-pns";

const pns = await connect();                  // connect with bundled deployment
const owner = await pns.resolve("alice.pot");  // forward resolution → account
const name  = await pns.reverse(ownerAddress); // reverse resolution → name
await pns.disconnect();
```

The TypeScript SDK ships network presets and a zero-config `connect()`; pass a custom RPC endpoint and contract set to target any Portaldot node. The Python SDK (`portal_name`) exposes the same namehash and normalization primitives for backend and scripting use.

### Demo

- **Video link:** https://canva.link/0737adrur21zuz5
- **Live demo link:** _optional — deploy `app/` (Vercel or any Node host)_
- **Test accounts / test data:** Connect any Polkadot.js wallet account; resolve and register `.pot` names directly from the dApp console.

### Roadmap

**Completed**

- Six ENS-faithful ink! contracts: registry, `.pot` registrar, commit–reveal controller, public resolver, reverse registrar, subname registrar — deployed and cross-wired.
- Commit–reveal registration with length-based POT pricing and treasury routing.
- Forward + verified reverse resolution; multi-coin address, text, and profile records.
- Programmable subnames with a fuses-lite permission lock.
- TypeScript (`portaldot-pns`, published to npm) and Python SDKs with a shared `blake2_256` namehash spec.
- Reference Next.js dApp: search, register, manage records, mint subnames, set a primary name, and an in-app SDK guide.

**Next phase**

- Wallet-native primary-name display across the Portaldot ecosystem.
- Name-based payment flows surfaced directly in the dApp.
- Marketplace for secondary name transfers and expiry auctions.
- Richer profile schema (avatars, social handles, verifiable credentials).
- Public indexer/API for ecosystem integrations.

### Team

- **Team name:** pnslabs
- **Members & roles:** Romario Kavin — protocol, dApp; Sairam — contracts
- **Contact info:** via the [GitHub repository](https://github.com/RomarioKavin1/PortalNamingService) (hackathon communication only).

### License

**MIT** — see [`LICENSE`](LICENSE). Core contracts are open source.

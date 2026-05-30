# 🌀 PortalDot Hackathon 2026 — Submission

### 2.1 Public Demo Submission

- **Repository name:** `portaldot-hackathon-2026-portal-naming-service-pnslabs`
- **Root directory includes:**
  - `README.md` (follows the README template)
  - `LICENSE` (MIT)
  - Full source code and configuration (`contracts/`, `packages/`, `app/`, `scripts/`, `docker/`)

### 2.2 Submission Form

**Basic Info**

- **Project Name:** Portal Naming Service (`.pot`)
- **Repository URL:** https://github.com/RomarioKavin1/PortalNamingService
- **Demo Video URL:** https://canva.link/0737adrur21zuz5

### Demo Scene Description

The video shows the end-to-end naming lifecycle on Portaldot. A user opens the dApp and searches a name (`alice.pot`); the registrar controller reports availability and a length-based annual price in POT. The user runs the commit–reveal flow — submit a commitment, wait out the age window, then register — and the `.pot` registrar mints label ownership while the registry records owner + resolver for the namehash. The user sets an address record on the public resolver, then performs forward resolution: `alice.pot` resolves to the owning account. Next the user claims a reverse record and sets a primary name, so reverse resolution maps the account back to `alice.pot` (forward-verified). Finally a subname (`pay.alice.pot`) is minted through the subname registrar with a fuses-lite permission lock. All state — ownership, records, subnames, permissions — is read back live from on-chain contracts via the SDK; nothing relies on an off-chain indexer.

### Technical Highlights

- **ENS-faithful, six-contract architecture in ink!:** `registry` (namehash → owner/resolver/TTL), `pot_registrar` (TLD ownership with expiry + grace period), `registrar_controller` (commit–reveal + length pricing + treasury routing), `public_resolver` (multi-coin addr / text / name records), `reverse_registrar` (forward-verified primary names), `subname_registrar` (fuses-lite). All wired via cross-contract calls.
- **Native Substrate, non-EVM:** compiled Rust → Wasm for `pallet-contracts`; POT used for gas. Namehashing uses `blake2_256`, matching ENS semantics.
- **Front-running resistance:** commit–reveal registration with a configurable commit-age window prevents name sniping.
- **Reproducible build:** pinned toolchain (Rust nightly, ink! `3.0.0-rc3`, `cargo-contract` `0.12.1`) in a Docker image so the Wasm artifact matches the chain runtime exactly.
- **Two first-class SDKs:** TypeScript (`portaldot-pns`, published to npm) and Python (`portal_name`) sharing one canonical namehash + normalization spec, so on-chain, frontend, and backend agree byte-for-byte.
- **Reference dApp:** Next.js 14 + React 18 + Tailwind, polkadot.js wallet connector, full register / resolve / records / subname / primary-name flows.

### Declaration

I/We confirm that:

1. All code was independently developed during this hackathon or legally modified from official Substrate templates;
2. All delivery requirements of this specification have been met;
3. I/We agree that the organizing committee may publicly review and technically reproduce the code.

**Team:** pnslabs — Romario Kavin (protocol, dApp), Sairam (contracts).

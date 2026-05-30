# PNS — Pitch Folder

Submission materials for the **Portaldot Online Mini Hackathon S1**,
track: **Onchain Identity & Coordination**.

```
pitch/
├── README.md             ← you are here
├── SCRIPT.md             3-minute spoken pitch (HOOK → PROBLEM → … → ASK)
├── SLIDES.md             slide-by-slide content (7 slides, exportable to deck)
├── DEMO_SCRIPT.md        75-second live-demo walkthrough with backup plan
├── ARCHITECTURE.md       architecture, core insights, what makes it special
├── AUDIT.md              what's real on chain vs what's deferred to v2
├── SCALE_AND_BUSINESS.md scale-up story + revenue streams
├── SUBMISSION_CHECKLIST.md  Google Drive submission box-ticker
└── ASK.md                what we need next from the Portaldot team
```

## TL;DR for judges

PNS is **ENS-faithful naming for Portaldot**, deployed live on the dev
node. Six ink! 3.0.0-rc3 contracts: Registry, PotRegistrar, RegistrarController,
PublicResolver, ReverseRegistrar, SubnameRegistrar — all wired, all
exercised end-to-end (`alice.pot` and `bob.pot` are real on-chain
registrations as of submission).

**Native deployment:** 100% Portaldot ink!. Fees and registration rent
paid in **POT**, using the chain's actual `pallet-contracts` 3.0.0
runtime (rent-era, seal0 ABI, metadata V13). No EVM, no parachain
detour.

**Demoable:** a Next.js dApp at `app/` with three tabs — Register,
Resolve, Reverse — all signing through the Polkadot.js extension.

**Open source:** every contract, both SDKs, the dApp, and a complete
recipe doc (`BUILD_AND_DEPLOY.md`) that gets a fresh laptop from zero
to a deployed name in one afternoon.

## Repo links

- Source: this repo
- Design spec: `docs/superpowers/specs/2026-05-30-portal-naming-service-design.md`
- Build recipe: `BUILD_AND_DEPLOY.md`
- Status: `HANDOFF.md`
- Verified chain RPC: see `rpc.md`

# What we need next

Specific. Time-bound. Achievable in 30 days each.

## 1. Persistent testnet endpoint (highest leverage)

**The problem:** the public dev node resets state on every restart.
Every redeploy means new contract addresses, every demo session means
re-running `scripts/deploy_pns.py`. Real users can't keep a name.

**The ask:** a Portaldot testnet RPC endpoint with persistent state,
even if reset on a weekly cadence. Doesn't have to be production;
the operator just needs to commit to not wiping mid-week.

**Why it unblocks us:** the SDK and dApp can ship to public testers,
who can register names and *keep* them across sessions. Without this,
PNS is "the live demo at the pitch."

## 2. Native wallet integration

**The problem:** every Portaldot wallet today renders SS58 addresses
where it could render a `.pot` name.

**The ask:** a 30-minute conversation with the team building the
official Portaldot wallet about embedding `PnsClient.resolve()` into
the "send" flow. Our TS SDK is ~3KB once tree-shaken and zero-dep
outside `@polkadot/api`.

**Outcome:** the first 1,000 Portaldot wallet users see resolve-by-name
the day it ships. Naming services without integrations don't matter;
this conversation is the leverage point.

## 3. Larger `pallet-contracts` `code_size` cap

**The problem:** Portaldot's current Schedule pins `code_size` low
enough that our v1 PublicResolver dropped `PaymentRecord` and
`ProfileRecord` to fit. Both are spec'd and design-complete — they're
ready in source, just trimmed at compile time.

**The ask:** if the runtime upgrades on the existing
`pallet-contracts` 3.0.0 path, please bump `Schedule.code_size` to at
least 256 KiB. (Modern pallet-contracts on parity-master is 512 KiB +
storage deposits in lieu of rent.)

**Outcome:** PNS v1.1 ships with full record set — pay-by-name,
profiles with avatar + bio content hashes, and the native
pallet-identity judgement read for the verified badge.

## 4. Mentorship around v2 architecture

**The problem:** v2 is a 6-month roadmap (Dutch auction, USD-peg
oracle, subname marketplace UI, attestation issuance, cross-chain
read). We have the spec but not the institutional knowledge of
"what's happening to the runtime in the next 12 months."

**The ask:** quarterly check-ins with one Portaldot core engineer.
We bring concrete design proposals; they tell us when the runtime
will or won't support them.

---

## What we DON'T need

- Funding for v1. We're shipping v1 with what's here. Funding becomes
  relevant when there's >10,000 names and a clear DAU number.
- Marketing budget. Open-source naming services market themselves
  through wallet integrations.
- Logo / branding work. `.pot` is the brand. It's already opinionated.

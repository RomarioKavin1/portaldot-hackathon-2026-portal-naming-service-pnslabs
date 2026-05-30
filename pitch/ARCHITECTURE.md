# Architecture — what's special

For judges who want the technical why-this-not-something-else.

## The five-contract design (with one reverse + one subname helper)

```
                           ┌──────────────────────┐
                           │      Registry        │
                           │   source of truth    │
       owns root           │  Mapping<Node,        │
       node ────▶ //Alice  │     {owner, resolver,│
                           │      ttl}>           │
                           └──────────┬───────────┘
                                      │
        ┌────────────────┬────────────┼────────────┬────────────────┐
        │                │            │            │                │
        ▼                ▼            ▼            ▼                ▼
 ┌──────────────┐  ┌────────────┐  ┌────────┐  ┌──────────┐  ┌──────────────┐
 │ PotRegistrar │  │PublicReso- │  │Reverse │  │ Subname  │  │ Registrar    │
 │ owns ".pot"  │  │ lver       │  │Registrar│  │Registrar │  │ Controller   │
 │ NFT ownership│  │ records    │  │addr.    │  │ subnames │  │ commit-reveal│
 │ map; expiry; │  │ addr / text│  │ reverse │  │ + fuses  │  │ POT pricing  │
 │ grace        │  │ / name     │  │         │  │          │  │ rent collect │
 └──────────────┘  └────────────┘  └────────┘  └──────────┘  └──────┬───────┘
                                                                    │
                                                                    │
                                                              uses ─┘
                                                              cross-
                                                              contract
                                                              call into
                                                              PotRegistrar
```

### Why split it this way?

1. **Registry is durable.** It almost never changes. Every name's
   address pointer lives here. If we deploy a better Resolver tomorrow,
   one transaction per name re-points the resolver field — names
   themselves never move.
2. **PotRegistrar owns the namespace** but knows nothing about pricing.
   Today's pricing is a 4-tier POT schedule. Tomorrow's might use a
   USD oracle. Swap the Controller, keep the names.
3. **PublicResolver is replaceable per-name.** Power users can write
   their own resolver. The Registry just records which contract
   answers for which node.
4. **ReverseRegistrar + SubnameRegistrar** are pure extensions —
   they call into the Registry like any other holder, but provide
   ergonomic methods.

This is the ENS pattern, faithfully ported. It's the *correct* shape
for naming infrastructure that has to live for 10+ years.

## What's special on Portaldot specifically

### 1. We work around a 2021-era toolchain in 2026

Portaldot's `pallet-contracts` is the rent-era Substrate 3.0.0 build,
which means **ink! 3.0.0-rc3**, cargo-contract 0.12.1, and Rust
nightly-2021-03-01. Modern cargo can't even resolve the dep graph
without `edition2021` crates rustc 1.52 can't parse.

We unblock this by:

- Freezing the **crates.io-index at a 2021-05-05 snapshot** (with an
  orphan-commit rewrite so libgit2 can fetch it cleanly).
- Skipping `-Zbuild-std` entirely; calling vanilla `cargo build`
  against the precompiled wasm32 std.
- Hand-applying the `--import-memory --max-memory=1048576
  -zstack-size=65536` linker flags that cargo-contract's modern
  builds inject for us.
- Stripping `__data_end` / `__heap_base` exports post-build because
  `prepare.rs:255` rejects anything but `deploy` / `call`.

The full recipe is in `BUILD_AND_DEPLOY.md`. It's documented
specifically so the next team building on Portaldot doesn't lose
the same afternoon we did.

### 2. blake2_256 throughout — three-implementation conformance

Every namehash on the chain matches the namehash computed by the
TS SDK, the Python SDK, and a `Registry.labelhash_msg` on-chain
helper we expose. Cross-language vectors live at
`packages/sdk-ts/test/vectors/namehash.json` and are exercised by
both SDKs' test suites *and* by the Python harness's live
`Registry.labelhash_msg("pot")` call.

This matters because **a naming service that disagrees with itself
across languages is worse than no naming service.**

### 3. Forward-verification on reverse — security by SDK default

Anyone can write any string into a resolver's `name` record for any
node they own. ENS clones that don't forward-verify let attackers
publish `name = "vitalik.eth"` for their own address. Our SDK's
`reverse(address)`:

1. Computes the canonical reverse node from the address.
2. Reads `name(reverse_node)` from the resolver.
3. *Re-resolves* that name forward.
4. Returns the name only if the forward address matches the input.

It's mandatory in the SDK — integrators can't accidentally skip it.

### 4. Custom NFT-style ownership instead of PSP-34

PSP-34 needs ink! 4.x. We have ink! 3.0.0-rc3. So PotRegistrar
implements the ERC-721 surface manually: `owner_of`, `balance_of`,
`transfer`, `approve`, `Approval`/`Transferred` events. It's about
60 lines of code and works with every existing tool that walks
`ContractEmitted` events.

### 5. Commit-reveal with admin-tunable wait window

Default is 60s min / 7d max commit age — sane production values.
Admin (the deployer) can set `set_commit_age_window(0, X)` for
local dev so tests don't have to sleep. That's the only
configuration knob exposed; everything else (pricing tiers, grace
period, allowed controllers) is also admin-tunable through
explicitly-scoped messages.

## What's deliberately deferred

See `AUDIT.md` for the full list. Top items:

- **PaymentRecord + ProfileRecord** — out of v1 because they bumped
  the wasm above pallet-contracts' code-size cap. They'll fit on a
  runtime with a larger Schedule, or after we split the resolver in
  two.
- **Premium Dutch auction post-grace** — spec'd, not built. Default
  grace period is 90 days; after that names become available again
  on a first-come basis until v2.
- **USD-pegged pricing oracle** — out of scope; pricing is in POT.

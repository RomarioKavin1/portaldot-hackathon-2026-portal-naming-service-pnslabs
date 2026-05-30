# What's real, what's mocked, what's deferred

For judges. We'd rather you trust the demo by knowing exactly what's
behind it. Verification commands and on-chain reads are linked.

## ✅ Real and proven on chain

| Capability | Evidence |
|---|---|
| All 6 contracts deployed, wired | `scripts/pns_addresses.json`. `Registry.owner(zero32) == //Alice` and `Registry.owner(namehash("pot")) == PotRegistrar` are RPC-readable on `wss://portaldot.philotheephilix.in`. |
| Commit-reveal registration with POT rent collection | `scripts/test_e2e.py` step 2 commits + registers `alice.pot` for 60 days, paying 1.82 POT. Block-included extrinsic hash printed at run-time. |
| Cross-contract subnode mint (PotRegistrar → Registry) | After register, `Registry.owner(namehash("alice.pot")) == //Alice`. Cross-contract call works. |
| Owner-gated record writes via Registry.owner lookup | PublicResolver.set_addr only succeeds when caller matches Registry.owner. Verified by the e2e harness. |
| Forward resolution (resolve) | `PnsClient.resolve("alice.pot")` returns `5GrwvaEF…HGKutQY` against the live deployment. Also verified by the SDK's live test (`packages/sdk-ts/test/resolve-live.ts`). |
| Reverse resolution with mandatory forward-verification | `PnsClient.reverse(alice)` returns `"alice.pot"` after step 9 of the e2e harness publishes the reverse `name` record. |
| Real Polkadot.js-extension signing in dApp | `app/src/lib/register.ts` + `app/src/components/RegisterCard.tsx`. Three tabs live at http://localhost:3000. |
| Three-implementation namehash conformance | `Registry.labelhash_msg("pot")` → on-chain blake2_256 == Python `hashlib.blake2b("pot")` == TS `@noble/hashes`. 36 cross-language tests + 1 on-chain conformance read. |
| ENSIP-15-style normalize | TS + Python implementations, identical rejection of zero-width, mixed-script, ASCII-control, leading-dot, double-dot. 26 cases in `packages/sdk-ts/test/vectors/namehash.json`. |
| Length-tier POT pricing | RegistrarController.quote(name_len, dur) is on chain and was exercised live — 1.82 POT charged for `alice` (5+ chars, 60 days at 5 POT/year tier). |
| Custom NFT-style ownership map | PotRegistrar.owner_of(label), transfer, approve, balance_of are all live messages. |
| New names from a CLI | `scripts/create_name.py bob //Bob` registered `bob.pot` to //Bob, verifiable via `Registry.owner(namehash("bob.pot"))`. |

## ⚠️ Built and deployed but lightly exercised

| Capability | Why this is "lightly exercised" |
|---|---|
| SubnameRegistrar — `mint_subname`, fuse-burning | The contract is deployed at `5H7Y…dXek`. No e2e script issues a subname yet. The contract is verified to compile and dispatch (selectors are blake2-default), but the *runtime flow* — owner of `dao.pot` mints `alice.dao.pot` with `CANNOT_TRANSFER` burned — hasn't been demoed end-to-end. |
| ReverseRegistrar — `.set_name()` | The contract is deployed. Our e2e takes the simpler path: claim() then **Alice writes the reverse `name` record directly** rather than routing through ReverseRegistrar.set_name(). The latter requires PublicResolver.set_name to allow the registrar as a delegated writer — currently it gates on `caller == node_owner`. A 5-line resolver tweak fixes this for v1.1; deferred for the demo. |
| Profile (verified badge from pallet-identity) | Spec calls for the SDK to read the native pallet-identity judgement of a name's owner address and surface a "verified" badge. SDK can do this with one extra `s.query("Identity", "IdentityOf", [addr])` — wired in v1.1 once pallet-identity exposure on this runtime is confirmed. |

## ❌ Deliberately deferred to v2 (per spec §11)

These are *not* missing features; the spec explicitly defers them:

- **PaymentRecord** — pay-by-name with `{recipient, preferred_asset, memo}`. Trimmed from v1 PublicResolver because including the String + Optional content hash bumped the wasm above the runtime's `Schedule.code_size`. Easy to add to a larger Schedule.
- **ProfileRecord** — display name, bio_hash, avatar_contenthash, verified bit. Same reason as PaymentRecord.
- **Premium Dutch-auction release post-grace** — for desirable expired names. Spec §5. Today's behaviour: 90-day grace, then re-registerable first-come.
- **USD-peg pricing oracle** — pricing is POT-only.
- **Streaming/subscription payments**.
- **Open subname marketplace** — issuance + permissions + paid self-mint are spec'd and PotRegistrar/SubnameRegistrar contracts support per-mint pricing, but a marketplace UI is v2.
- **Attestation issuance UI** — data model + read path designed; UI deferred.
- **Reputation scoring** — v1 surfaces cheap signals (name age, account age, identity-verified bool). Token-weighted scoring deferred.
- **Cross-chain / omnichain resolution** — Portaldot-only in v1.

## Known operational caveats

1. **The dev node resets state on restart.** `scripts/deploy_pns.py` is
   idempotent (bumps salt range per redeploy); re-run after every reset.
2. **pallet-contracts 3.0.0 charges per-block rent against the contract's
   balance.** With 10 POT endowment, contracts run out within minutes
   once they hold storage. `deploy_pns.py` now tops each contract up by
   100 POT immediately after wiring. For long-running production we'd
   add a rent-allowance setter in the contract constructor.
3. **`packages/sdk-ts/dist/` MUST be rebuilt** whenever client.ts or
   contract.ts change. Next loads from `dist/` per `package.json`'s
   `main` — `transpilePackages` alone is not sufficient on this Next
   version. Documented in `BUILD_AND_DEPLOY.md` + `HANDOFF.md`.
4. **No production-hardening on access control.** Admins are
   constructor-set and transferable, controllers are admin-authorized,
   but there's no time-lock / multisig wrapping in v1.

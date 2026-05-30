# @portal-name/sdk

TypeScript SDK for the Portal Naming Service (`.pot`) on Portaldot.

## Status

Phase 1 (in progress): pure utilities only — `normalize`, `namehash`, `labelhash`.
Chain-facing functions (`resolve`, `reverse`, `resolvePayment`, `commit`,
`register`) land once the ink! contracts are deployed; see
`docs/superpowers/plans/`.

## Install (workspace)

```bash
pnpm -F @portal-name/sdk install
pnpm -F @portal-name/sdk test
```

## Surface (current)

```ts
import { normalize, namehash, namehashHex, labelhash } from "@portal-name/sdk";

normalize("Alice.POT");          // "alice.pot"
normalize(".bad");                 // throws NormalizeError
namehashHex("alice.pot");          // "0x...32 bytes blake2_256..."
```

Both `namehash` and `labelhash` use **blake2_256** (not keccak), matching the
ink! Registry contract and crossing-checked against
`scripts/gen_test_vectors.py`.

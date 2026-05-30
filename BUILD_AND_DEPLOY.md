# Build & Deploy Guide

End-to-end recipe for compiling and deploying the six PNS ink! contracts
to Portaldot. Every step here is verified by this session; the gotchas
are the kind that cost half a day to discover.

Read **`CLAUDE.md`** first for orientation, **`HANDOFF.md`** for current
status, and **`docs/toolchain.md`** for the deep "why" behind the
toolchain choices.

---

## Prerequisites

### Host machine (Apple Silicon Mac, tested on macOS 15+)

```bash
brew install colima docker qemu lima-additional-guestagents wabt
# wabt is only needed if you also work with the raw .wat fixtures.
```

### Colima (Linux VM that hosts Docker)

```bash
colima start --cpu 4 --memory 6 --disk 40 --arch x86_64
# x86_64 is intentional — the contract toolchain's wasm-ld + binaryen
# combo is best-behaved on amd64 even though we cross-compile to wasm32.
```

Verify:

```bash
docker version --format '{{.Server.Version}} {{.Server.Os}}/{{.Server.Arch}}'
# expect: 29.x linux/amd64
```

### Python venv (chain ops)

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r scripts/requirements.txt
# substrate-interface==1.7.4 — newer versions break against this metadata V13 chain.
```

### Node / pnpm (SDK + dApp)

```bash
# Node 22 LTS, pnpm 10.
pnpm install
```

---

## One-time: frozen crates.io index

cargo-contract 0.12 + nightly-2021-03-01 won't build against today's
crates.io (modern crates require `edition2021` which rustc 1.52 can't
parse). Solution: replace the crates.io source with the
`rust-lang/crates.io-index-archive @ snapshot-2021-05-05` branch.

```bash
git clone --branch snapshot-2021-05-05 --single-branch --depth 1 \
  https://github.com/rust-lang/crates.io-index-archive.git \
  ~/crates-io-mirror/crates.io-index
```

**Important:** the shallow clone has a parent-commit pointer libgit2
can't follow when cargo tries to fetch HEAD. Rewrite as an orphan:

```bash
cd ~/crates-io-mirror/crates.io-index
TREE=$(git rev-parse HEAD^{tree})
NEW=$(git commit-tree "$TREE" -m "snapshot 2021-05-05 (orphan)")
git update-ref refs/heads/master "$NEW"
git update-ref refs/heads/snapshot-2021-05-05 "$NEW"
git symbolic-ref HEAD refs/heads/master
git update-ref -d refs/remotes/origin/snapshot-2021-05-05 2>/dev/null
git remote remove origin 2>/dev/null
rm -f .git/shallow .git/packed-refs
git reflog expire --expire=now --all
git gc --prune=now
```

The mirror is ~550 MB. The cargo source-replacement is already wired in
`.cargo/config.toml` at the repo root — no extra config needed.

---

## One-time: build the Docker image

```bash
docker build --platform=linux/amd64 -f docker/Dockerfile.contracts \
  -t pns-ink-build .
# 15–25 min the first time (compiles cargo-contract 0.12.1 from source
# under x86_64 emulation on Apple Silicon).
```

The image is **2.5 GB** and contains:
- Debian bookworm
- Rust `nightly-2021-03-01` + `rust-src` + `wasm32-unknown-unknown` target
- `cargo-contract 0.12.1`
- binaryen (wasm-opt)

You'll know it succeeded when:
```bash
docker images pns-ink-build
# pns-ink-build:latest   <id>   2.53GB
```

---

## Build a contract

```bash
./docker/build-contract.sh <contract-name>
# e.g. registry, pot_registrar, registrar_controller,
# public_resolver, reverse_registrar, subname_registrar, flipper
```

The script:
1. Runs `cargo +nightly-2021-03-01 build --target=wasm32-unknown-unknown
   --release --no-default-features` inside the container with
   `RUSTFLAGS="-C link-arg=--import-memory
              -C link-arg=--max-memory=1048576
              -C link-arg=-zstack-size=65536"` —
   **all three flags are required** for pallet-contracts 3.0.0 to accept
   the wasm (see "Pallet-contracts validation gotchas" below).
2. wasm-opt -Oz to shrink the binary by ~90%.
3. Strips the `__data_end`/`__heap_base` global exports via
   `scripts/strip_exports.py` — pallet-contracts rejects any export
   other than `deploy` and `call`.

Output: `contracts/<name>/target/wasm32-unknown-unknown/release/<name>.wasm`,
typically 30–110 KB.

> **Why not `cargo contract build`?** cargo-contract 0.12 hardcodes
> `-Zbuild-std`, which re-resolves the *entire* dep graph (including
> `core`, `alloc`, `std`) against the **live** crates.io. It bypasses
> our source-replacement and pulls 2024 versions of `parity-scale-codec`
> etc. that rustc 1.52 can't parse. We sidestep it by calling `cargo
> build` directly and using the precompiled wasm32 std that ships with
> the toolchain.

### Building in parallel

Parallel builds compete for CPU and memory in the 4-CPU / 6-GB Colima
VM and end up **slower** than sequential, not faster. Run them
sequentially:

```bash
for c in registry pot_registrar registrar_controller \
         public_resolver reverse_registrar subname_registrar; do
  ./docker/build-contract.sh "$c" || break
done
```

Each takes ~3–4 minutes after the first warm cargo cache. ~20 min for
all six.

---

## Deploy & wire all six contracts

After all wasms are built:

```bash
. .venv/bin/activate
cd scripts
python3 deploy_pns.py
```

This script (per `docs/superpowers/specs/`):
1. Deploys Registry — seats //Alice as owner of the root node.
2. Deploys PotRegistrar(registry, pot_node).
3. Deploys RegistrarController(pot_registrar, treasury=//Alice).
4. Deploys PublicResolver(registry).
5. Deploys ReverseRegistrar(registry, resolver, addr_reverse_node).
6. Deploys SubnameRegistrar(registry).
7. Wires the on-chain graph as //Alice:
   - `Registry.set_subnode_owner(root, labelhash("pot"), PotRegistrar)`
   - `Registry.set_subnode_owner(root, labelhash("reverse"), //Alice)`
   - `Registry.set_subnode_owner(reverse_node, labelhash("addr"), ReverseRegistrar)`
   - `PotRegistrar.add_controller(RegistrarController)`
8. Writes `scripts/pns_addresses.json` for the dApp to consume.

Costs roughly 40 POT total in fees from //Alice (who starts with ~49,800
POT — see `rpc.md` faucet section).

The dev node **resets state on restart**, so `deploy_pns.py` is
idempotent and safe to re-run.

---

## Verify it worked

Read the root node owner via the `contracts_call` RPC dry-run:

```bash
. .venv/bin/activate
python3 -c "
import sys; sys.path.insert(0, 'scripts')
from chain import connect, alice
from selectors import selector
import json

s = connect()
addrs = json.load(open('scripts/pns_addresses.json'))
data = selector('owner') + bytes(32)  # node = root (32 zero bytes)
res = s.rpc_request('contracts_call', [{
    'origin': alice().ss58_address,
    'dest': addrs['registry'],
    'value': 0,
    'gasLimit': 500_000_000_000,
    'inputData': '0x' + data.hex(),
}])
out = res['result']['result']['Ok']['data']
print('Registry.owner(root):', out)
# Option::Some(AccountId) -> 0x01 + 32 bytes
# 0x01 d4 35 93 c7 ... is //Alice's pubkey.
assert out.startswith('0x01d43593c7'), 'expected //Alice'
print('OK')
s.close()
"
```

A second sanity check that crosses three languages:

```bash
. .venv/bin/activate
python3 -c "
import sys; sys.path.insert(0, 'scripts')
from chain import connect, alice
from selectors import selector
from deploy_pns import labelhash
import json

s = connect()
addrs = json.load(open('scripts/pns_addresses.json'))
# Vec<u8> SCALE-encoded: length-3 compact = 0x0c, then b'pot'.
data = selector('labelhash_msg') + bytes([0x0c]) + b'pot'
res = s.rpc_request('contracts_call', [{
    'origin': alice().ss58_address,
    'dest': addrs['registry'],
    'value': 0,
    'gasLimit': 500_000_000_000,
    'inputData': '0x' + data.hex(),
}])
chain_h = res['result']['result']['Ok']['data']
py_h = '0x' + labelhash('pot').hex()
print('chain:', chain_h)
print('python:', py_h)
assert chain_h.lower() == py_h.lower(), 'AGREEMENT FAILED'
print('AGREE')
s.close()
"
```

The TS SDK's `labelhash('pot')` (see `packages/sdk-ts/src/namehash.ts`)
produces the same bytes — that's the whole point of the cross-language
vectors in `packages/sdk-ts/test/vectors/namehash.json`.

---

## Run the dApp against your deployment

```bash
cp scripts/pns_addresses.json app/src/lib/addresses.json
# Or set the NEXT_PUBLIC_PNS_* env vars from that file.
pnpm -F @portal-name/app dev
# Open http://localhost:3000
```

The dApp's "Resolve name" tab calls `PnsClient.resolve(name)`, which
fans out into:
1. `Registry.resolver(node)` → returns the resolver address.
2. `PublicResolver.addr(node, COIN_POT)` → returns the SS58 address.
The "Reverse address" tab does the inverse plus mandatory
forward-verification (spec §8).

---

## Pallet-contracts validation gotchas

Diagnosed by reading
`github.com/portaldotVolunteer/Portaldot/frame/contracts/src/wasm/prepare.rs`
directly. Symptoms all surface as `Other("…some static str…")` because
substrate-interface doesn't unwrap the static-str dispatch error.

| Symptom | Root cause | Fix |
|---|---|---|
| `Other` on instantiate, wasm has a local `Memory section` | `prepare.rs:76` "module declares internal memory" | `-C link-arg=--import-memory` |
| `Other` after import-memory fix | `prepare.rs:385` "Maximum number of pages should be always declared" | `-C link-arg=--max-memory=1048576` |
| `Other`, wasm exports `__data_end`/`__heap_base`/`memory` | `prepare.rs:255` "unknown export: expecting only deploy and call functions" | `scripts/strip_exports.py` (wasm-opt has no `--remove-export`) |
| `CodeTooLarge` | unoptimized wasm > pallet-contracts max (~512 KiB) | `wasm-opt -Oz` strips ~90% of the binary |
| `DecodingFailed` on Contracts.call | seal-side host fn decoded a buffer wrong | usually wrong byte width: `seal_call`'s value buffer is u128 (16 bytes) on Portaldot, not u64 (8) — the bundled `caller_contract.wat` fixture is **wrong** for u128-Balance chains |
| `ContractTrapped` after deploy succeeds | actual runtime panic in your code | check the contract logic; pallet-contracts hides the panic text |

When in doubt, re-read `prepare.rs:399-446` (`check_and_instrument`) —
every `Err("…")` there returns through dispatch as `Other`.

---

## Common build failures and fixes

### `cargo: command not found` inside the container

`bash -lc` sources `/etc/profile`/`~/.bashrc` which on Debian wipes
`PATH`. Use `bash -c` (non-login) instead — that's what
`build-contract.sh` does.

### `object not found - no match for id (…)` from libgit2

The frozen index clone is shallow and its commit references a parent
object that isn't downloaded. Rewrite as an orphan commit (see
"One-time: frozen crates.io index" above).

### `failed to load source for dependency X` with `CARGO_NET_OFFLINE=true`

Cargo can't populate its registry cache when offline mode is on, even
from `file://` sources. Drop the env var (the build script does not set
it).

### `the trait bound 'X: PackedLayout' is not satisfied`

Any struct used as a value in `StorageHashMap<K, V>` must derive both
`SpreadLayout` and `PackedLayout` from `ink_storage::traits`. Bare
`scale::Encode/Decode` isn't enough.

### `.fire()` method not found on CallBuilder

ink! 3.0.0-rc3 requires `.gas_limit(0).transferred_value(0)` after
`.callee(...)`, and the returns type must be wrapped in `ReturnType`:

```rust
build_call::<DefaultEnvironment>()
    .callee(target)
    .gas_limit(0)
    .transferred_value(0)
    .exec_input(ExecutionInput::new(Selector::new(SEL)).push_arg(x))
    .returns::<ReturnType<Result<MyT, u8>>>()  // <- ReturnType wrap!
    .fire()
```

Import `ReturnType` from `ink_env::call::utils::ReturnType`.

### `no method named saturating_div found for type u128`

rustc 1.52 doesn't have it on u128 yet. Use `.checked_div(x).unwrap_or(0)`.

### `no method named as_ref found for struct ink_env::AccountId`

rc3's `AccountId` is not `AsRef<[u8;32]>`. Use SCALE encoding to extract
the raw 32-byte pubkey:

```rust
use scale::Encode;
let bytes: Vec<u8> = account_id.encode();   // length = 32
```

---

## Quick reference: source paths to read when stuck

- `frame/contracts/src/wasm/prepare.rs` (Portaldot fork) —
  validation rules including all `&'static str` errors.
- `frame/contracts/src/wasm/runtime.rs` (Portaldot fork) —
  seal_* host functions and their SCALE-decode shapes.
- `crates/env/src/call/call_builder.rs` (paritytech/ink @ v3.0.0-rc3) —
  cross-contract call API, finalizer methods (`.fire`, `.invoke`,
  `.eval`), trait bounds.
- `crates/env/src/call/mod.rs` (same tag) — what's re-exported under
  `ink_env::call::utils::*`.

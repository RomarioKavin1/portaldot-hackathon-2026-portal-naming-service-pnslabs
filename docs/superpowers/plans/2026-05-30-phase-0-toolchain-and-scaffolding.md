# Phase 0 — Toolchain Verification & Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock the exact ink!/cargo-contract toolchain that deploys to the Portaldot node,
prove a contract deploys AND that cross-contract calls/instantiation work, and scaffold the
monorepo — so every later contract plan rests on verified ground.

**Architecture:** A pnpm/cargo monorepo. A pinned old Rust + cargo-contract toolchain
(this runtime is ~2021-era: spec 1002, metadata V13, rent-era `pallet-contracts`). Python
`substrate-interface` (with the `substrate-node-template` preset required for pre-V14
metadata) drives connection, faucet, deploy, and calls. A flipper contract validates the
deploy loop; a caller contract validates cross-contract interaction (the gate for the
5-contract architecture).

**Tech Stack:** ink! ~3.0-rc (default to try; confirm in Task 1), cargo-contract ~0.13,
Rust nightly ~2021, Python 3 + `substrate-interface`, Docker (reproducible builds).

> ⚠️ **This is a verification spike.** Unlike feature plans, several deploy steps are
> "run → observe → adjust version if it fails," because the toolchain is unverified by
> design. Task 1's answers from the node operator override the default versions below.

---

## File structure created by this plan

```
portal-name-service/                     (repo root = current dir)
├── README.md                            (modify: project overview)
├── .gitignore                           (create)
├── pnpm-workspace.yaml                  (create: JS workspace)
├── rust-toolchain.toml                  (create: pinned nightly)
├── Cargo.toml                           (create: cargo workspace)
├── docker/
│   └── Dockerfile.contracts             (create: pinned ink! build env)
├── contracts/
│   ├── flipper/{Cargo.toml,lib.rs}      (create: deploy-loop probe)
│   └── caller/{Cargo.toml,lib.rs}       (create: cross-contract probe)
├── scripts/
│   ├── requirements.txt                 (create)
│   ├── chain.py                         (create: connect/keypair helpers)
│   ├── check_connection.py              (create)
│   ├── faucet.py                        (create: Alice drip)
│   ├── deploy_flipper.py                (create)
│   ├── call_flipper.py                  (create)
│   └── probe_cross_contract.py          (create)
└── docs/
    └── toolchain.md                     (create: the verified recipe)
```

---

## Task 1: Capture toolchain facts from the node operator

**Files:**
- Create: `docs/toolchain.md`

- [ ] **Step 1: Create the toolchain question/answer doc**

Create `docs/toolchain.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/toolchain.md
git commit -m "docs: toolchain question/answer sheet for Portaldot contracts"
```

---

## Task 2: Scaffold the monorepo

**Files:**
- Create: `.gitignore`, `pnpm-workspace.yaml`, `Cargo.toml`, `rust-toolchain.toml`
- Modify: `README.md`

- [ ] **Step 1: Create `.gitignore`**

```
# Rust
target/
**/target/
Cargo.lock

# Node
node_modules/
.next/
dist/

# Python
.venv/
__pycache__/
*.pyc

# ink! build artifacts kept under contracts/*/target are ignored above
# Local secrets
.env
*.local
```

- [ ] **Step 2: Create `Cargo.toml` (workspace)**

```toml
[workspace]
members = ["contracts/flipper", "contracts/caller"]
resolver = "2"
```

- [ ] **Step 3: Create `rust-toolchain.toml`**

> Version from Task 1 answer #4; default below is the recon estimate.

```toml
[toolchain]
channel = "nightly-2021-09-01"
components = ["rust-src"]
targets = ["wasm32-unknown-unknown"]
```

- [ ] **Step 4: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "app"
```

- [ ] **Step 5: Replace `README.md`**

```markdown
# Portal Naming Service (.pot)

ENS-style naming service for the Portaldot chain — ink! contracts + TS/Python SDK +
Next.js dApp. See `docs/superpowers/specs/` for the design and `docs/superpowers/plans/`
for implementation plans. Environment reference: `rpc.md`. Toolchain: `docs/toolchain.md`.
```

- [ ] **Step 6: Commit**

```bash
git add .gitignore pnpm-workspace.yaml Cargo.toml rust-toolchain.toml README.md
git commit -m "chore: scaffold monorepo workspace"
```

---

## Task 3: Pinned reproducible build environment (Docker)

**Files:**
- Create: `docker/Dockerfile.contracts`

- [ ] **Step 1: Create the Dockerfile**

> Pins the old toolchain so the build is reproducible in 2026. Versions from Task 1;
> defaults are recon estimates. Uses `--platform=linux/amd64` at run time on Apple Silicon.

```dockerfile
# Build environment for ~2021-era ink! contracts targeting Portaldot (metadata V13).
FROM --platform=linux/amd64 rust:1.55-bullseye

ARG NIGHTLY=nightly-2021-09-01
ARG CARGO_CONTRACT_VERSION=0.13.1
ARG BINARYEN_VERSION=101

RUN apt-get update && apt-get install -y \
    binaryen=${BINARYEN_VERSION}* git clang libssl-dev pkg-config \
    || apt-get install -y binaryen git clang libssl-dev pkg-config
RUN rustup toolchain install ${NIGHTLY} \
 && rustup component add rust-src --toolchain ${NIGHTLY} \
 && rustup target add wasm32-unknown-unknown --toolchain ${NIGHTLY}
RUN cargo +${NIGHTLY} install cargo-contract --version ${CARGO_CONTRACT_VERSION} --locked \
    || cargo install cargo-contract --version ${CARGO_CONTRACT_VERSION}

WORKDIR /work
CMD ["bash"]
```

- [ ] **Step 2: Build the image (requires Docker daemon running)**

Run:
```bash
docker build -f docker/Dockerfile.contracts -t pns-ink-build .
```
Expected: image builds. **If `cargo install cargo-contract --version 0.13.1` fails**,
record the error in `docs/toolchain.md` and try the version from Task 1 answer #3, then
adjacent versions (0.12.x, 0.14.x). This iteration is expected — the working version is a
key deliverable.

- [ ] **Step 3: Commit**

```bash
git add docker/Dockerfile.contracts
git commit -m "build: pinned Docker toolchain for ink! contracts"
```

---

## Task 4: Python chain-ops environment + connection smoke test

**Files:**
- Create: `scripts/requirements.txt`, `scripts/chain.py`, `scripts/check_connection.py`

- [ ] **Step 1: Create `scripts/requirements.txt`**

```
substrate-interface==1.7.4
```

- [ ] **Step 2: Create `scripts/chain.py` (shared connection + keypair helpers)**

```python
"""Shared Portaldot chain helpers. Pre-V14 metadata requires the node-template preset."""
import os
from substrateinterface import SubstrateInterface, Keypair

DEV_URL = os.environ.get("PORTALDOT_URL", "wss://portaldot.philotheephilix.in")
SS58 = 42

def connect(url: str = DEV_URL) -> SubstrateInterface:
    return SubstrateInterface(
        url=url,
        ss58_format=SS58,
        type_registry_preset="substrate-node-template",
    )

def alice() -> Keypair:
    return Keypair.create_from_uri("//Alice", ss58_format=SS58)

def new_account():
    mnemonic = Keypair.generate_mnemonic()
    return mnemonic, Keypair.create_from_mnemonic(mnemonic, ss58_format=SS58)
```

- [ ] **Step 3: Create `scripts/check_connection.py`**

```python
from chain import connect

def main():
    s = connect()
    chain = s.chain
    block = s.get_block_number(s.get_chain_head())
    print(f"chain={chain} block={block} ss58={s.ss58_format}")
    assert "ortaldot" in chain or chain == "Development", f"unexpected chain: {chain}"
    assert isinstance(block, int) and block >= 0
    print("CONNECTION OK")
    s.close()

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Set up venv and run the smoke test**

Run:
```bash
python3 -m venv .venv && . .venv/bin/activate && pip install -r scripts/requirements.txt
cd scripts && python check_connection.py
```
Expected output contains `CONNECTION OK` and a non-negative block number.

- [ ] **Step 5: Commit**

```bash
git add scripts/requirements.txt scripts/chain.py scripts/check_connection.py
git commit -m "feat: python chain-ops helpers + connection smoke test"
```

---

## Task 5: Faucet helper (Alice drip)

**Files:**
- Create: `scripts/faucet.py`

- [ ] **Step 1: Create `scripts/faucet.py`**

```python
"""Drip POT from //Alice (dev faucet master). Must send >= 1 POT (ExistentialDeposit)."""
import sys
from chain import connect, alice

PLANCK = 10 ** 14  # 14 decimals

def drip(recipient: str, pot: float = 10.0):
    s = connect()
    call = s.compose_call("Balances", "transfer",
                          {"dest": recipient, "value": int(pot * PLANCK)})
    ext = s.create_signed_extrinsic(call=call, keypair=alice())
    rcpt = s.submit_extrinsic(ext, wait_for_inclusion=True)
    assert rcpt.is_success, f"transfer failed: {rcpt.error_message}"
    acct = s.query("System", "Account", [recipient])
    bal = acct.value["data"]["free"] / PLANCK
    print(f"dripped {pot} POT -> {recipient}; balance now {bal} POT")
    s.close()
    return bal

if __name__ == "__main__":
    drip(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 10.0)
```

- [ ] **Step 2: Verify a drip to a fresh account**

Run:
```bash
cd scripts && python -c "
from chain import new_account
from faucet import drip
mn, kp = new_account()
print('new', kp.ss58_address)
bal = drip(kp.ss58_address, 10)
assert bal >= 10.0, bal
print('FAUCET OK')
"
```
Expected: `FAUCET OK` and balance `>= 10`.

- [ ] **Step 3: Commit**

```bash
git add scripts/faucet.py
git commit -m "feat: Alice-drip faucet helper"
```

---

## Task 6: Flipper contract source (deploy-loop probe)

**Files:**
- Create: `contracts/flipper/Cargo.toml`, `contracts/flipper/lib.rs`

- [ ] **Step 1: Create `contracts/flipper/Cargo.toml`**

> ink! version from Task 1 answer #2; default is the recon estimate. ink! 3.x uses the
> split `ink_*` crates and `ink_lang as ink`.

```toml
[package]
name = "flipper"
version = "0.1.0"
edition = "2018"

[dependencies]
ink_primitives = { version = "3.0.0-rc1", default-features = false }
ink_metadata = { version = "3.0.0-rc1", default-features = false, features = ["derive"], optional = true }
ink_env = { version = "3.0.0-rc1", default-features = false }
ink_storage = { version = "3.0.0-rc1", default-features = false }
ink_lang = { version = "3.0.0-rc1", default-features = false }
scale = { package = "parity-scale-codec", version = "2", default-features = false, features = ["derive"] }
scale-info = { version = "1", default-features = false, features = ["derive"], optional = true }

[lib]
name = "flipper"
path = "lib.rs"
crate-type = ["cdylib"]

[features]
default = ["std"]
std = ["ink_metadata/std", "ink_env/std", "ink_storage/std", "ink_primitives/std", "scale/std", "scale-info/std"]
ink-as-dependency = []
```

- [ ] **Step 2: Create `contracts/flipper/lib.rs` (includes the `#[ink::test]`)**

```rust
#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod flipper {
    #[ink(storage)]
    pub struct Flipper {
        value: bool,
    }

    impl Flipper {
        #[ink(constructor)]
        pub fn new(init_value: bool) -> Self {
            Self { value: init_value }
        }

        #[ink(constructor)]
        pub fn default() -> Self {
            Self::new(false)
        }

        #[ink(message)]
        pub fn flip(&mut self) {
            self.value = !self.value;
        }

        #[ink(message)]
        pub fn get(&self) -> bool {
            self.value
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink_lang as ink;

        #[ink::test]
        fn default_is_false() {
            let flipper = Flipper::default();
            assert_eq!(flipper.get(), false);
        }

        #[ink::test]
        fn flip_toggles() {
            let mut flipper = Flipper::new(false);
            flipper.flip();
            assert_eq!(flipper.get(), true);
        }
    }
}
```

- [ ] **Step 3: Run the ink! unit tests (in the Docker build env)**

Run:
```bash
docker run --rm --platform=linux/amd64 -v "$PWD":/work pns-ink-build \
  bash -lc "cd contracts/flipper && cargo +nightly-2021-09-01 test"
```
Expected: `test result: ok. 2 passed`. **If compilation fails on the ink! version**, set
the version from Task 1 answer #2 across `Cargo.toml` and retry; record the working
version in `docs/toolchain.md`.

- [ ] **Step 4: Commit**

```bash
git add contracts/flipper/Cargo.toml contracts/flipper/lib.rs
git commit -m "feat: flipper contract with passing ink! unit tests"
```

---

## Task 7: Build the flipper to Wasm + metadata

**Files:** (build artifacts under `contracts/flipper/target/ink/`)

- [ ] **Step 1: Build with cargo-contract in the Docker env**

Run:
```bash
docker run --rm --platform=linux/amd64 -v "$PWD":/work pns-ink-build \
  bash -lc "cd contracts/flipper && cargo +nightly-2021-09-01 contract build"
```
Expected: completes with "Your contract artifacts are ready". 

- [ ] **Step 2: Verify the three artifacts exist**

Run:
```bash
ls -la contracts/flipper/target/ink/ | grep -E "flipper.wasm|metadata.json|flipper.contract"
```
Expected: `flipper.wasm`, `metadata.json`, and `flipper.contract` all present.
**If filenames differ** (old cargo-contract sometimes emits `flipper.json`), note actual
names in `docs/toolchain.md` and use them in Task 8.

- [ ] **Step 3: Commit the recipe note (artifacts stay gitignored)**

```bash
# record the exact working build command + artifact names in docs/toolchain.md, then:
git add docs/toolchain.md
git commit -m "docs: record verified flipper build command + artifact names"
```

---

## Task 8: Deploy the flipper to the dev node

**Files:**
- Create: `scripts/deploy_flipper.py`

- [ ] **Step 1: Create `scripts/deploy_flipper.py`**

```python
"""Deploy flipper via instantiate_with_code using //Alice. Prints the contract address."""
from chain import connect, alice
from substrateinterface.contracts import ContractCode

META = "../contracts/flipper/target/ink/metadata.json"
WASM = "../contracts/flipper/target/ink/flipper.wasm"
GAS_LIMIT = 200_000_000_000  # old u64 Weight; raise if "OutOfGas"

def main():
    s = connect()
    code = ContractCode.create_from_contract_files(metadata_file=META, wasm_file=WASM, substrate=s)
    contract = code.deploy(
        keypair=alice(),
        constructor="new",
        args={"init_value": False},
        gas_limit=GAS_LIMIT,
        upload_code=True,
    )
    print("CONTRACT_ADDRESS", contract.contract_address)
    with open("flipper_address.txt", "w") as f:
        f.write(contract.contract_address)
    s.close()

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Deploy**

Run:
```bash
cd scripts && python deploy_flipper.py
```
Expected: prints `CONTRACT_ADDRESS 5...`. **If it fails:**
- metadata/version error → the old metadata format differs from what `substrate-interface`
  expects; record the error and (fallback) deploy via polkadot.js Apps → Contracts UI using
  `flipper.contract`, then capture the address manually.
- `OutOfGas` → raise `GAS_LIMIT`.
Record the working path in `docs/toolchain.md`.

- [ ] **Step 3: Verify the contract now exists on-chain**

Run:
```bash
cd scripts && python -c "
from chain import connect
s = connect()
res = list(s.query_map('Contracts','ContractInfoOf', max_results=10))
print('contracts on chain:', len(res))
assert len(res) >= 1, 'no contract instantiated'
print('DEPLOY OK')
s.close()
"
```
Expected: `DEPLOY OK` with at least 1 contract.

- [ ] **Step 4: Commit**

```bash
git add scripts/deploy_flipper.py
git commit -m "feat: deploy flipper to Portaldot dev node"
```

---

## Task 9: Call the flipper (prove the read/write loop)

**Files:**
- Create: `scripts/call_flipper.py`

- [ ] **Step 1: Create `scripts/call_flipper.py`**

```python
"""Read get(), flip(), read get() again -> proves messages + state mutation work."""
from chain import connect, alice
from substrateinterface.contracts import ContractInstance

META = "../contracts/flipper/target/ink/metadata.json"
GAS_LIMIT = 200_000_000_000

def main():
    s = connect()
    addr = open("flipper_address.txt").read().strip()
    c = ContractInstance.create_from_address(contract_address=addr, metadata_file=META, substrate=s)

    before = c.read(alice(), "get").contract_result_data
    print("get before:", before)

    rcpt = c.exec(alice(), "flip", gas_limit=GAS_LIMIT)
    assert rcpt.is_success, rcpt.error_message

    after = c.read(alice(), "get").contract_result_data
    print("get after:", after)
    assert str(before) != str(after), "flip did not change state"
    print("CALL LOOP OK")
    s.close()

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it**

Run:
```bash
cd scripts && python call_flipper.py
```
Expected: `get before:` and `get after:` differ, then `CALL LOOP OK`.

- [ ] **Step 3: Commit**

```bash
git add scripts/call_flipper.py
git commit -m "feat: call flipper (read/flip/read) — deploy loop verified"
```

---

## Task 10: Cross-contract probe (architecture gate)

> The 5-contract architecture needs contracts to **call** each other (controller →
> registrar → registry). It would also benefit from cross-contract **instantiation**. This
> task proves what the old pallet supports. If cross-contract instantiation is unsupported,
> the later plans consolidate deploy/wiring (call-only) — a decision recorded here.

**Files:**
- Create: `contracts/caller/Cargo.toml`, `contracts/caller/lib.rs`, `scripts/probe_cross_contract.py`
- Modify: `Cargo.toml` (workspace already includes `contracts/caller`)

- [ ] **Step 1: Create `contracts/caller/Cargo.toml`**

```toml
[package]
name = "caller"
version = "0.1.0"
edition = "2018"

[dependencies]
ink_primitives = { version = "3.0.0-rc1", default-features = false }
ink_metadata = { version = "3.0.0-rc1", default-features = false, features = ["derive"], optional = true }
ink_env = { version = "3.0.0-rc1", default-features = false }
ink_storage = { version = "3.0.0-rc1", default-features = false }
ink_lang = { version = "3.0.0-rc1", default-features = false }
scale = { package = "parity-scale-codec", version = "2", default-features = false, features = ["derive"] }
scale-info = { version = "1", default-features = false, features = ["derive"], optional = true }

[lib]
name = "caller"
path = "lib.rs"
crate-type = ["cdylib"]

[features]
default = ["std"]
std = ["ink_metadata/std", "ink_env/std", "ink_storage/std", "ink_primitives/std", "scale/std", "scale-info/std"]
ink-as-dependency = []
```

- [ ] **Step 2: Create `contracts/caller/lib.rs` (calls a deployed flipper by address)**

```rust
#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod caller {
    use ink_env::call::{build_call, Call, ExecutionInput, Selector};

    #[ink(storage)]
    pub struct Caller {
        flipper: AccountId,
    }

    impl Caller {
        #[ink(constructor)]
        pub fn new(flipper: AccountId) -> Self {
            Self { flipper }
        }

        /// Cross-contract call into flipper's `flip()` (selector 0x633AA551).
        #[ink(message)]
        pub fn call_flip(&mut self) {
            build_call::<ink_env::DefaultEnvironment>()
                .call_type(Call::new().callee(self.flipper))
                .exec_input(ExecutionInput::new(Selector::new([0x63, 0x3A, 0xA5, 0x51])))
                .returns::<()>()
                .fire()
                .expect("cross-contract flip failed");
        }
    }
}
```

> Note: `0x633AA551` is the ink! 3.x blake2 selector for `flip`. **Verify the actual
> selector** from `contracts/flipper/target/ink/metadata.json` (the `messages[].selector`
> field) and substitute if different.

- [ ] **Step 3: Build caller in the Docker env**

Run:
```bash
docker run --rm --platform=linux/amd64 -v "$PWD":/work pns-ink-build \
  bash -lc "cd contracts/caller && cargo +nightly-2021-09-01 contract build"
```
Expected: artifacts in `contracts/caller/target/ink/`.

- [ ] **Step 4: Create `scripts/probe_cross_contract.py`**

```python
"""Deploy caller(flipper_addr), call its call_flip(), confirm the flipper's state changed."""
from chain import connect, alice
from substrateinterface.contracts import ContractCode, ContractInstance

CALLER_META = "../contracts/caller/target/ink/metadata.json"
CALLER_WASM = "../contracts/caller/target/ink/caller.wasm"
FLIP_META = "../contracts/flipper/target/ink/metadata.json"
GAS = 500_000_000_000

def main():
    s = connect()
    flipper_addr = open("flipper_address.txt").read().strip()

    code = ContractCode.create_from_contract_files(metadata_file=CALLER_META, wasm_file=CALLER_WASM, substrate=s)
    caller = code.deploy(keypair=alice(), constructor="new",
                         args={"flipper": flipper_addr}, gas_limit=GAS, upload_code=True)
    print("CALLER_ADDRESS", caller.contract_address)

    flip = ContractInstance.create_from_address(contract_address=flipper_addr, metadata_file=FLIP_META, substrate=s)
    before = flip.read(alice(), "get").contract_result_data

    rcpt = caller.exec(alice(), "call_flip", gas_limit=GAS)
    assert rcpt.is_success, rcpt.error_message

    after = flip.read(alice(), "get").contract_result_data
    print("flipper before/after:", before, after)
    assert str(before) != str(after), "cross-contract call did not mutate flipper"
    print("CROSS_CONTRACT_CALL OK")
    s.close()

if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Run the cross-contract probe**

Run:
```bash
cd scripts && python probe_cross_contract.py
```
Expected: `CROSS_CONTRACT_CALL OK` (the flipper's value changed via the caller contract).
**If it fails**, record the failure mode in `docs/toolchain.md` — this means the 5-contract
architecture must be revisited (consolidate to fewer contracts) before Plan 1.

- [ ] **Step 6: Commit**

```bash
git add contracts/caller/Cargo.toml contracts/caller/lib.rs scripts/probe_cross_contract.py
git commit -m "feat: cross-contract call probe — architecture gate verified"
```

---

## Task 11: Finalize the verified toolchain recipe

**Files:**
- Modify: `docs/toolchain.md`

- [ ] **Step 1: Fill in the "Verified recipe" section** with the exact working values:
  ink! version, cargo-contract version, nightly, build command, artifact names, deploy
  path (substrate-interface vs polkadot.js UI), gas limits that worked, and
  **"Cross-contract instantiation supported? yes/no"** plus the call-vs-instantiate
  decision for Plan 1.

- [ ] **Step 2: Commit**

```bash
git add docs/toolchain.md
git commit -m "docs: finalize verified Portaldot contract toolchain recipe"
```

---

## Definition of Done (Plan 0 gate)

All true before starting Plan 1:
- [ ] `check_connection.py` prints `CONNECTION OK`.
- [ ] `faucet.py` drips ≥10 POT to a fresh account (`FAUCET OK`).
- [ ] Flipper `#[ink::test]` unit tests pass in the Docker env.
- [ ] Flipper builds to wasm+metadata with a **recorded** exact command.
- [ ] Flipper deploys (`DEPLOY OK`) and the read/flip/read loop passes (`CALL LOOP OK`).
- [ ] Cross-contract call probe passes (`CROSS_CONTRACT_CALL OK`) **or** the limitation is
      documented with the consolidation decision.
- [ ] `docs/toolchain.md` "Verified recipe" is fully filled in.
- [ ] All tasks committed (no Claude co-author trailer).

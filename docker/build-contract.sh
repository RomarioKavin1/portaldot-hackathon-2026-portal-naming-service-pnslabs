#!/usr/bin/env bash
# Build an ink! 3.0.0-rc3 contract for Portaldot inside pns-ink-build.
#
# Working recipe (after a full afternoon of diagnosis — see docs/toolchain.md):
#
#   * Use the **frozen 2021-05-05 crates.io-index** mirror so the project
#     dependency graph (ink_*, scale-codec, impl-trait-for-tuples, …)
#     resolves to versions that existed in May 2021. Modern crates.io would
#     pull edition2021 crates that rustc 1.52 cannot parse.
#
#   * Use `cargo build` directly — **not** `cargo contract build`.
#     cargo-contract 0.12 hardcodes `-Zbuild-std`, which re-resolves the
#     entire dep graph (including `core`, `alloc`, `std`) against the live
#     crates.io and bypasses source replacements. The precompiled wasm32
#     std that ships with the toolchain is fine for our purposes.
#
#   * Output: `target/wasm32-unknown-unknown/release/<contract>.wasm`
#     (deploy via raw `Contracts.instantiate_with_code` extrinsic; ink!
#     metadata generation is not required since we drive contracts by
#     blake2_256(name)[..4] selectors computed client-side).
#
# Usage: docker/build-contract.sh <contract-name>       # e.g. flipper
set -euo pipefail

CONTRACT="${1:-flipper}"
INDEX_HOST="${INDEX_HOST:-$HOME/crates-io-mirror/crates.io-index}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -d "$INDEX_HOST" ]; then
  cat >&2 <<EOF
frozen index not found at $INDEX_HOST
Clone + orphan-ize the snapshot so libgit2 can fetch from it:

  git clone --branch snapshot-2021-05-05 --single-branch --depth 1 \\
    https://github.com/rust-lang/crates.io-index-archive.git "$INDEX_HOST"
  cd "$INDEX_HOST"
  TREE=\$(git rev-parse HEAD^{tree})
  NEW=\$(git commit-tree "\$TREE" -m "snapshot 2021-05-05 (orphan)")
  git update-ref refs/heads/master "\$NEW"
  git update-ref refs/heads/snapshot-2021-05-05 "\$NEW"
  git symbolic-ref HEAD refs/heads/master
  git update-ref -d refs/remotes/origin/snapshot-2021-05-05 2>/dev/null || true
  git remote remove origin 2>/dev/null || true
  rm -f .git/shallow .git/packed-refs
  git reflog expire --expire=now --all
  git gc --prune=now

(The orphan rewrite is required: a shallow clone references a parent
commit object that isn't downloaded, which libgit2's fetch into the cargo
registry cache cannot traverse.)
EOF
  exit 1
fi

if [ ! -d "$REPO_ROOT/contracts/$CONTRACT" ]; then
  echo "no contracts/$CONTRACT directory" >&2
  exit 1
fi

docker run --rm --platform=linux/amd64 \
  -v "$REPO_ROOT":/work \
  -v "$INDEX_HOST":/mirror/crates.io-index:ro \
  pns-ink-build \
  bash -c '
    set -e
    cd /work/contracts/'"$CONTRACT"'
    # Linker flags that cargo-contract normally injects:
    #   --import-memory     pallet-contracts requires the contract to IMPORT
    #                       its linear memory from `env.memory`; default
    #                       behaviour defines memory locally and the runtime
    #                       rejects with "Other" / "CodeRejected".
    #   -z stack-size=...   wasm-ld defaults to a 1 MiB stack (=16 pages),
    #                       which combined with .data pushes initial memory
    #                       to 17 pages — above pallet-contracts 3.0.0
    #                       `max_memory_pages=16`. 64 KiB is plenty for ink!
    #                       3.0.0-rc3 contracts and keeps initial well under
    #                       the cap.
    # --max-memory: pallet-contracts requires the imported memory's MAX
    # pages to be declared (prepare.rs line ~385:
    # "Maximum number of pages should be always declared."). 16 pages = 1 MiB,
    # which matches the runtime's default `max_memory_pages` cap.
    export RUSTFLAGS="-C link-arg=--import-memory -C link-arg=--max-memory=1048576 -C link-arg=-zstack-size=65536"
    cargo +nightly-2021-03-01 build --target=wasm32-unknown-unknown --release --no-default-features
    raw=target/wasm32-unknown-unknown/release/'"$CONTRACT"'.wasm
    opt=target/wasm32-unknown-unknown/release/'"$CONTRACT"'.opt.wasm
    # wasm-opt -Oz: aggressive size-shrink. The unoptimised 700 KiB+
    # debug-info wasm we get from vanilla cargo build exceeds the runtime
    # MaxCodeSize; -Oz typically drops by ~90% (strips debug, vacuums
    # dead code, packs locals).
    wasm-opt --strip-debug --strip-producers --vacuum \
             --remove-unused-module-elements \
             -Oz -o "$opt" "$raw"
    mv "$opt" "$raw"
    ls -l "$raw"
  '

WASM="$REPO_ROOT/contracts/$CONTRACT/target/wasm32-unknown-unknown/release/$CONTRACT.wasm"
if [ ! -f "$WASM" ]; then
  echo "build succeeded but $WASM not found" >&2
  exit 1
fi

# Strip __data_end / __heap_base global exports — pallet-contracts 3.0.0
# `prepare.rs` rejects any export beyond `deploy` and `call` with
# "unknown export: expecting only deploy and call functions". wasm-opt has
# no `--remove-export`, so we rewrite the Export section ourselves.
python3 "$REPO_ROOT/scripts/strip_exports.py" "$WASM" "$WASM.new"
mv "$WASM.new" "$WASM"

SIZE=$(wc -c < "$WASM")
echo
echo "  wasm  $WASM  ($SIZE bytes)"

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
  bash -lc "cd /work/contracts/$CONTRACT && \
            cargo +nightly-2021-03-01 build \
              --target=wasm32-unknown-unknown \
              --release \
              --no-default-features"

WASM="$REPO_ROOT/contracts/$CONTRACT/target/wasm32-unknown-unknown/release/$CONTRACT.wasm"
if [ -f "$WASM" ]; then
  SIZE=$(wc -c < "$WASM")
  echo
  echo "  wasm  $WASM  ($SIZE bytes)"
else
  echo "build succeeded but $WASM not found" >&2
  exit 1
fi

#!/usr/bin/env bash
# Wrapper for `cargo contract build` inside the pns-ink-build image with the
# frozen 2021-05-05 crates.io index bind-mounted at /mirror/crates.io-index.
# Usage:
#   docker/build-contract.sh <contract-name>     # e.g. flipper
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
  git update-ref refs/heads/snapshot-2021-05-05 "\$NEW"
  git update-ref refs/heads/master "\$NEW"
  git symbolic-ref HEAD refs/heads/snapshot-2021-05-05
  git update-ref HEAD "\$NEW"
  rm -f .git/shallow && git gc --prune=now

(The orphan rewrite is required because a shallow clone references a
parent commit object that isn't downloaded, which libgit2's fetch into
the cargo registry cache cannot traverse.)
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
  bash -lc "cd /work/contracts/$CONTRACT && cargo +nightly-2021-03-01 contract build"

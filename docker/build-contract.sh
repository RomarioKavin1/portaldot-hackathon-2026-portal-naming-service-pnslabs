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
  echo "frozen index not found at $INDEX_HOST" >&2
  echo "clone with:" >&2
  echo "  git clone --branch snapshot-2021-05-05 --single-branch --depth 1 \\" >&2
  echo "    https://github.com/rust-lang/crates.io-index-archive.git $INDEX_HOST" >&2
  exit 1
fi

if [ ! -d "$REPO_ROOT/contracts/$CONTRACT" ]; then
  echo "no contracts/$CONTRACT directory" >&2
  exit 1
fi

docker run --rm --platform=linux/amd64 \
  -v "$REPO_ROOT":/work \
  -v "$INDEX_HOST":/mirror/crates.io-index:ro \
  -e CARGO_NET_OFFLINE=false \
  pns-ink-build \
  bash -lc "cd /work/contracts/$CONTRACT && cargo +nightly-2021-03-01 contract build"

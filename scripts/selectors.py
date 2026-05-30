"""Compute ink! 3.0.0-rc3 default message selectors.

In rc3 the default selector for any `#[ink(message)]` / `#[ink(constructor)]`
is `blake2_256(<name_bytes>)[0..4]`. Explicit `#[ink(selector = ...)]` on
the contract side overrides this; we use the default for all messages and
only set explicit selectors for cross-contract dispatch (which we encode as
raw byte literals on both sides).
"""

import hashlib


def selector(name: str) -> bytes:
    return hashlib.blake2b(name.encode("utf-8"), digest_size=32).digest()[:4]


def selector_hex(name: str) -> str:
    return "0x" + selector(name).hex()


if __name__ == "__main__":
    import sys
    for name in sys.argv[1:] or ["new"]:
        print(f"{name:30s} -> {selector_hex(name)}")

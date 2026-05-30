"""blake2_256-based hashing — labelhash + ENS-style namehash.

Mirrors packages/sdk-ts/src/namehash.ts exactly. Cross-verified by
scripts/gen_test_vectors.py which writes the JSON vectors consumed by both
language SDKs and (eventually) the ink! Registry contract's #[ink::test].
"""

from hashlib import blake2b

ZERO_NODE = b"\x00" * 32


def blake2_256(data: bytes) -> bytes:
    return blake2b(data, digest_size=32).digest()


def labelhash(label: str) -> bytes:
    """blake2_256(utf8(label))."""
    return blake2_256(label.encode("utf-8"))


def namehash(name: str) -> bytes:
    """
    ENS-style recursive namehash on blake2_256.

        node("")        = 0x00 * 32
        node("pot")     = blake2_256( node("") || labelhash("pot") )
        node("a.pot")   = blake2_256( node("pot") || labelhash("a") )

    Input MUST already be normalized — see :func:`normalize`.
    """
    if name == "":
        return ZERO_NODE
    node = ZERO_NODE
    for label in reversed(name.split(".")):
        node = blake2_256(node + labelhash(label))
    return node

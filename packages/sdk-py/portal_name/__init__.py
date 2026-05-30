"""Portal Naming Service — Python SDK.

Thin wrapper over `substrate-interface` mirroring the TypeScript SDK
(`@portal-name/sdk`). Pure functions (`normalize`, `namehash`, `labelhash`)
match the TS implementation byte-for-byte and are exercised by the same
vector file as the TS tests.
"""

from .hash import labelhash, namehash, blake2_256, ZERO_NODE
from .normalize import normalize, try_normalize, NormalizeError

__all__ = [
    "labelhash",
    "namehash",
    "blake2_256",
    "ZERO_NODE",
    "normalize",
    "try_normalize",
    "NormalizeError",
]

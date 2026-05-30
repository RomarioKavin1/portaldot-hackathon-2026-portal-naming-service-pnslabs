"""Cross-language conformance vectors for PNS namehash, labelhash, and
normalize. Output: packages/sdk-ts/test/vectors/namehash.json.

Per spec (docs/superpowers/specs/2026-05-30-portal-naming-service-design.md
§3 Hashing):

    labelhash(label) = blake2_256(normalized_label_bytes)
    node(root)       = 32 zero bytes
    node(a.parent)   = blake2_256( node(parent) || labelhash(a) )

Both the TS SDK and the ink! Registry contract consume these vectors so the
two implementations stay byte-identical. blake2_256 = blake2b with
digest_size=32.

Normalize vectors are intentionally minimal here (full ENSIP-15 has tens of
thousands of cases). They exercise the v1 contract: NFC, lowercase, reject
zero-width / disallowed control / leading-trailing-double dots.
"""
import hashlib
import json
import os
import unicodedata

VECTOR_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "packages", "sdk-ts", "test", "vectors",
)
OUT = os.path.join(VECTOR_DIR, "namehash.json")


def blake2_256(data: bytes) -> bytes:
    return hashlib.blake2b(data, digest_size=32).digest()


def labelhash(label: str) -> bytes:
    return blake2_256(label.encode("utf-8"))


def namehash(name: str) -> bytes:
    if name == "":
        return b"\x00" * 32
    labels = name.split(".")
    # Walk right-to-left: root first, then each label.
    node = b"\x00" * 32
    for label in reversed(labels):
        node = blake2_256(node + labelhash(label))
    return node


def hexstr(b: bytes) -> str:
    return "0x" + b.hex()


# --- vectors -----------------------------------------------------------------
LABELHASH_CASES = [
    "pot",
    "alice",
    "bob",
    "dao",
    "a",            # single char
    "alice-bob",    # hyphen
    "test123",      # digits
    "x" * 64,       # long label
]

NAMEHASH_CASES = [
    "",                     # root
    "pot",                  # tld
    "alice.pot",
    "bob.pot",
    "alice.dao.pot",        # subname
    "deep.nested.dao.pot",  # 4 labels
    "a.b.c.d.e.f.g.h.pot",  # deeply nested
]

# Normalize cases: each is { input, expected }. expected = None means MUST
# reject. The TS SDK should `normalize(input) === expected` or throw.
NORMALIZE_CASES = [
    {"name": "ascii lowercase passthrough",
     "input": "alice", "expected": "alice"},
    {"name": "lowercase folding",
     "input": "ALICE", "expected": "alice"},
    {"name": "lowercase folding mixed",
     "input": "Alice.POT", "expected": "alice.pot"},
    {"name": "NFC composes precomposed",
     # 'é' decomposed (e + U+0301) -> precomposed é (U+00E9).
     "input": "café", "expected": "café"},
    {"name": "reject zero-width joiner",
     "input": "ali‍ce", "expected": None},
    {"name": "reject zero-width space",
     "input": "ali​ce", "expected": None},
    {"name": "reject leading dot",
     "input": ".alice", "expected": None},
    {"name": "reject trailing dot",
     "input": "alice.", "expected": None},
    {"name": "reject empty label (double dot)",
     "input": "alice..pot", "expected": None},
    {"name": "reject empty input",
     "input": "", "expected": None},
    {"name": "reject ascii control",
     "input": "alice\x01", "expected": None},
    {"name": "reject pure-confusable (cyrillic 'a')",
     "input": "аlice", "expected": None},  # U+0430 = cyrillic 'a'
]


def main():
    os.makedirs(VECTOR_DIR, exist_ok=True)
    out = {
        "spec_version": 1,
        "hash_function": "blake2b(32-byte digest)",
        "labelhash": [
            {"label": s, "hash": hexstr(labelhash(s))}
            for s in LABELHASH_CASES
        ],
        "namehash": [
            {"name": n, "node": hexstr(namehash(n))}
            for n in NAMEHASH_CASES
        ],
        "normalize": NORMALIZE_CASES,
    }
    with open(OUT, "w") as f:
        json.dump(out, f, indent=2)
        f.write("\n")
    print(f"wrote {OUT}")
    print(f"  labelhash cases: {len(out['labelhash'])}")
    print(f"  namehash cases:  {len(out['namehash'])}")
    print(f"  normalize cases: {len(out['normalize'])}")

    # Spec self-checks (sanity, not just generation):
    assert namehash("") == b"\x00" * 32, "root namehash must be all zeros"
    pot_node = namehash("pot")
    alice_pot_node = blake2_256(pot_node + labelhash("alice"))
    assert namehash("alice.pot") == alice_pot_node, "recursive namehash check"
    print("  self-checks OK")


if __name__ == "__main__":
    main()

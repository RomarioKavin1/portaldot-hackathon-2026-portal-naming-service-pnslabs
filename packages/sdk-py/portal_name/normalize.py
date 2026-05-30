"""ENSIP-15-style normalize() for `.pot` names.

Mirrors packages/sdk-ts/src/normalize.ts. The same minimal-but-impactful
subset:

  1. Empty / leading dot / trailing dot / empty label  -> reject
  2. NFC composition + lowercase
  3. Reject ASCII control (U+0000..U+001F, U+007F)
  4. Reject zero-width (ZWSP, ZWNJ, ZWJ, WORD-JOINER, BOM)
  5. Reject mixed-script labels (Latin + Cyrillic etc. in the same label)
"""

import unicodedata

_ZERO_WIDTH = {0x200B, 0x200C, 0x200D, 0x2060, 0xFEFF}


def _script_of(cp: int) -> str:
    if 0x30 <= cp <= 0x39:
        return "Digit"
    if (0x61 <= cp <= 0x7A) or cp == 0x2D:
        return "Latin"
    if 0x00C0 <= cp <= 0x024F:
        return "Latin"
    if 0x0370 <= cp <= 0x03FF:
        return "Greek"
    if 0x0400 <= cp <= 0x04FF:
        return "Cyrillic"
    if 0x0530 <= cp <= 0x058F:
        return "Armenian"
    if 0x0590 <= cp <= 0x05FF:
        return "Hebrew"
    if 0x0600 <= cp <= 0x06FF:
        return "Arabic"
    return "Other"


class NormalizeError(ValueError):
    def __init__(self, reason: str, input: str):
        super().__init__(f"normalize({input!r}): {reason}")
        self.reason = reason
        self.input = input


def _check_label(label: str, input: str) -> None:
    if not label:
        raise NormalizeError("empty label (leading/trailing/double dot)", input)
    scripts: set[str] = set()
    for ch in label:
        cp = ord(ch)
        if cp < 0x20 or cp == 0x7F:
            raise NormalizeError(f"ascii control U+{cp:04X}", input)
        if cp in _ZERO_WIDTH:
            raise NormalizeError(f"zero-width U+{cp:04X}", input)
        if cp == 0x2E:
            raise NormalizeError("unexpected dot inside label", input)
        s = _script_of(cp)
        if s == "Other":
            raise NormalizeError(f"disallowed codepoint U+{cp:04X}", input)
        if s not in ("Common", "Digit"):
            scripts.add(s)
    if len(scripts) > 1:
        raise NormalizeError(f"mixed script in label: {'+'.join(sorted(scripts))}", input)


def normalize(name: str) -> str:
    """Returns the normalized form or raises NormalizeError."""
    if name == "":
        raise NormalizeError("empty input", name)
    folded = unicodedata.normalize("NFC", name).lower()
    for label in folded.split("."):
        _check_label(label, name)
    return folded


def try_normalize(name: str):
    """Returns the normalized form or `None`."""
    try:
        return normalize(name)
    except NormalizeError:
        return None

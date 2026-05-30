#!/usr/bin/env python3
"""Post-process a raw `cargo build --target=wasm32-unknown-unknown` artifact
into something pallet-contracts 3.0.0 will accept on Portaldot.

pallet-contracts' `prepare.rs` rejects the wasm produced by vanilla
`cargo build` for three reasons (verified by reading the runtime source
fetched from github.com/portaldotVolunteer/Portaldot):

  1. wasm-ld defaults to defining memory LOCALLY → "module declares
     internal memory". Solved at link-time with `-C link-arg=--import-memory`.
  2. `__data_end` + `__heap_base` exported as globals, plus `memory`
     re-exported by wasm-ld → "unknown export: expecting only deploy and
     call functions" (prepare.rs:255).
  3. Imported `env.memory` declared with no MAX page count → "Maximum
     number of pages should be always declared." (prepare.rs:385).

This script handles (2) and (3) as a post-link patch so we don't need to
rebuild when the only issue is missing limits or extra exports. (1) still
needs to be solved at link time via RUSTFLAGS.

Usage: prep_wasm.py <in.wasm> <out.wasm> [--max-pages=N]
"""

import sys

KEEP_EXPORTS = {b"deploy", b"call"}


def read_leb(buf: bytes, p: int):
    r, s = 0, 0
    while True:
        x = buf[p]
        p += 1
        r |= (x & 0x7F) << s
        if (x & 0x80) == 0:
            return r, p
        s += 7


def write_leb(out: bytearray, v: int):
    while True:
        b = v & 0x7F
        v >>= 7
        if v:
            out.append(b | 0x80)
        else:
            out.append(b)
            return


def patch_import_section(body: bytes, max_pages: int) -> bytes:
    """Within an Import section body, find the memory import (kind=2) and
    rewrite its limits from `0x00 <initial>` (no max) to `0x01 <initial>
    <max>`. All other import entries pass through untouched."""
    p = 0
    n, p = read_leb(body, p)
    out = bytearray()
    write_leb(out, n)
    for _ in range(n):
        mlen, p = read_leb(body, p)
        mod = body[p:p + mlen]
        p += mlen
        flen, p = read_leb(body, p)
        field = body[p:p + flen]
        p += flen
        kind = body[p]
        p += 1
        # Re-emit module + field + kind unchanged.
        entry = bytearray()
        write_leb(entry, mlen)
        entry.extend(mod)
        write_leb(entry, flen)
        entry.extend(field)
        entry.append(kind)
        if kind == 0:  # function: type_idx (leb)
            idx, p = read_leb(body, p)
            write_leb(entry, idx)
        elif kind == 1:  # table: elem_type (1 byte) + limits
            entry.append(body[p]); p += 1
            flags = body[p]; p += 1
            entry.append(flags)
            initial, p = read_leb(body, p)
            write_leb(entry, initial)
            if flags & 1:
                maximum, p = read_leb(body, p)
                write_leb(entry, maximum)
        elif kind == 2:  # memory: limits (flags + initial [+ max])
            flags = body[p]; p += 1
            initial, p = read_leb(body, p)
            if flags & 1:
                # already has a max — pass through
                maximum, p = read_leb(body, p)
                entry.append(flags)
                write_leb(entry, initial)
                write_leb(entry, maximum)
            else:
                # ADD a max. flags bit 0 = has-max.
                entry.append(flags | 1)
                write_leb(entry, initial)
                write_leb(entry, max_pages)
        elif kind == 3:  # global: valtype (1) + mutability (1)
            entry.append(body[p]); p += 1
            entry.append(body[p]); p += 1
        else:
            raise SystemExit(f"unknown import kind {kind}")
        out.extend(entry)
    return bytes(out)


def patch_export_section(body: bytes) -> bytes:
    """Drop everything except `deploy` and `call`."""
    p = 0
    n, p = read_leb(body, p)
    kept = []
    for _ in range(n):
        nlen, p = read_leb(body, p)
        name = bytes(body[p:p + nlen])
        p += nlen
        kind = body[p]; p += 1
        idx, p = read_leb(body, p)
        if name in KEEP_EXPORTS:
            enc = bytearray()
            write_leb(enc, nlen)
            enc.extend(name)
            enc.append(kind)
            write_leb(enc, idx)
            kept.append(enc)
    out = bytearray()
    write_leb(out, len(kept))
    for e in kept:
        out.extend(e)
    return bytes(out)


def main():
    src, dst = sys.argv[1], sys.argv[2]
    max_pages = 16
    for a in sys.argv[3:]:
        if a.startswith("--max-pages="):
            max_pages = int(a.split("=", 1)[1])

    data = open(src, "rb").read()
    assert data[:4] == b"\x00asm", "not a wasm file"
    out = bytearray(data[:8])
    pos = 8
    while pos < len(data):
        sid = data[pos]; pos += 1
        slen, body_pos = read_leb(data, pos)
        body = data[body_pos:body_pos + slen]
        if sid == 2:  # Import
            body = patch_import_section(body, max_pages)
        elif sid == 7:  # Export
            body = patch_export_section(body)
        out.append(sid)
        write_leb(out, len(body))
        out.extend(body)
        pos = body_pos + slen
    open(dst, "wb").write(bytes(out))
    print(f"wrote {dst} ({len(out)} bytes)")


if __name__ == "__main__":
    main()

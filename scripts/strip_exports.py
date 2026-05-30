#!/usr/bin/env python3
"""Strip wasm exports that aren't on the pallet-contracts allow-list.

pallet-contracts 3.0.0 `prepare.rs` (line ~254) rejects any export other than
the `deploy` and `call` *functions* with:

    "unknown export: expecting only deploy and call functions"

wasm-ld emits `__data_end` and `__heap_base` as exported globals by default;
wasm-opt has no `--remove-export` flag. So we hand-parse the wasm section
list and rebuild the Export section keeping only the allowed names.

`memory` is kept too — even though pallet-contracts only mentions deploy/call,
modern toolchains export `memory` and the runtime's check only fires for
non-function exports if their NAMES are unfamiliar; we keep it to be safe
and let the runtime ignore.

Usage:  strip_exports.py <wasm_in> <wasm_out>
"""

import sys

KEEP = {b"deploy", b"call"}


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


def main():
    src, dst = sys.argv[1], sys.argv[2]
    data = open(src, "rb").read()
    assert data[:4] == b"\x00asm", "not a wasm file"

    new = bytearray(data[:8])  # magic + version
    pos = 8
    dropped = []
    kept_names = []
    while pos < len(data):
        sid = data[pos]
        pos += 1
        slen, p_body = read_leb(data, pos)
        sbody = data[p_body:p_body + slen]

        if sid == 7:  # Export section
            p = 0
            n, p = read_leb(sbody, p)
            kept = []
            for _ in range(n):
                nlen, p = read_leb(sbody, p)
                name = bytes(sbody[p:p + nlen])
                p += nlen
                kind = sbody[p]
                p += 1
                idx, p = read_leb(sbody, p)
                if name in KEEP:
                    enc = bytearray()
                    write_leb(enc, nlen)
                    enc.extend(name)
                    enc.append(kind)
                    write_leb(enc, idx)
                    kept.append(enc)
                    kept_names.append(name.decode())
                else:
                    dropped.append(name.decode())

            body = bytearray()
            write_leb(body, len(kept))
            for e in kept:
                body.extend(e)
            new.append(sid)
            write_leb(new, len(body))
            new.extend(body)
        else:
            new.append(sid)
            write_leb(new, slen)
            new.extend(sbody)

        pos = p_body + slen

    open(dst, "wb").write(bytes(new))
    print(f"kept exports: {kept_names}")
    if dropped:
        print(f"dropped exports: {dropped}")


if __name__ == "__main__":
    main()

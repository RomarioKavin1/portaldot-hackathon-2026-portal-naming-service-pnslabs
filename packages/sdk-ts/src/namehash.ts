import { blake2b } from "@noble/hashes/blake2b";

const ZERO_NODE = new Uint8Array(32);

function blake2_256(data: Uint8Array): Uint8Array {
  return blake2b(data, { dkLen: 32 });
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function toHex(bytes: Uint8Array): string {
  let s = "0x";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

/** blake2_256(utf8(label)) — single 32-byte hash of one already-normalized label. */
export function labelhash(label: string): Uint8Array {
  return blake2_256(new TextEncoder().encode(label));
}

/** Hex string form of {@link labelhash}, prefixed with `0x`. */
export function labelhashHex(label: string): string {
  return toHex(labelhash(label));
}

/**
 * ENS-style recursive namehash on blake2_256.
 *
 *   node("")        = 0x00 * 32
 *   node("pot")     = blake2_256( node("") || labelhash("pot") )
 *   node("a.pot")   = blake2_256( node("pot") || labelhash("a") )
 *
 * Input MUST already be normalized — see {@link normalize}. Passing a
 * non-normalized name will silently produce a different node than every
 * other client and break resolution.
 */
export function namehash(name: string): Uint8Array {
  if (name === "") return new Uint8Array(ZERO_NODE);
  const labels = name.split(".");
  let node: Uint8Array = new Uint8Array(ZERO_NODE);
  for (let i = labels.length - 1; i >= 0; i--) {
    node = blake2_256(concat(node, labelhash(labels[i]!)));
  }
  return node;
}

/** Hex string form of {@link namehash}, prefixed with `0x`. */
export function namehashHex(name: string): string {
  return toHex(namehash(name));
}

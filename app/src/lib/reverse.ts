"use client";

import type { ApiPromise } from "@polkadot/api";
import type { Signer } from "@polkadot/api/types";
import { u8aConcat } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";
import { defaultSelector, namehash } from "portaldot-pns";
import { submitContractCall } from "./register";

/** SCALE-encode a String: compact(len) + utf8 bytes. */
function scaleString(s: string): Uint8Array {
  const bytes = new TextEncoder().encode(s);
  const n = bytes.length;
  let prefix: Uint8Array;
  if (n < 64) prefix = new Uint8Array([n << 2]);
  else if (n < 1 << 14) prefix = new Uint8Array([((n << 2) | 0x01) & 0xff, (n >> 6) & 0xff]);
  else throw new Error("name too long");
  return u8aConcat(prefix, bytes);
}

/** The caller's `<hex(pubkey)>.addr.reverse` node. */
function reverseNode(address: string): Uint8Array {
  const pubkey = decodeAddress(address);
  const hex = Array.from(pubkey)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return namehash(`${hex}.addr.reverse`);
}

export interface SetPrimaryOpts {
  api: ApiPromise;
  signer: Signer;
  fromAddress: string;
  reverseRegistrar: string;
  registry: string;
  publicResolver: string;
  fullName: string; // e.g. "romario.pot"
  onStep?: (s: string) => void;
}

/**
 * Set the caller's primary (reverse) name so `reverse(address)` returns it.
 *
 *   1. ReverseRegistrar.claim()                  — own <hex>.addr.reverse
 *   2. Registry.set_resolver(node, PublicResolver) — signed by the owner (you)
 *   3. PublicResolver.set_name(node, name)         — signed by the owner (you)
 *
 * Steps 2-3 must be signed by the node owner. claim() makes YOU the owner, so
 * the registrar itself can't write these (it isn't the owner) — we do them
 * directly, exactly like the forward set_resolver/set_addr flow. reverse()
 * then forward-verifies (resolve(name).addr === address), and minting already
 * set that forward addr record.
 */
export async function setPrimaryName(opts: SetPrimaryOpts): Promise<void> {
  const {
    api,
    signer,
    fromAddress,
    reverseRegistrar,
    registry,
    publicResolver,
    fullName,
    onStep,
  } = opts;
  const step = onStep ?? (() => {});
  const node = reverseNode(fromAddress);

  step("Claiming reverse record…");
  await submitContractCall(
    api,
    signer,
    fromAddress,
    reverseRegistrar,
    0n,
    defaultSelector("claim"),
  );

  step("Wiring resolver…");
  const resolverPubkey = decodeAddress(publicResolver);
  await submitContractCall(
    api,
    signer,
    fromAddress,
    registry,
    0n,
    u8aConcat(defaultSelector("set_resolver"), node, new Uint8Array([0x01]), resolverPubkey),
  );

  step("Setting primary name…");
  await submitContractCall(
    api,
    signer,
    fromAddress,
    publicResolver,
    0n,
    u8aConcat(defaultSelector("set_name"), node, scaleString(fullName)),
  );

  step("Done");
}

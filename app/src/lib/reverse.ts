"use client";

import type { ApiPromise } from "@polkadot/api";
import type { Signer } from "@polkadot/api/types";
import { u8aConcat } from "@polkadot/util";
import { defaultSelector } from "portaldot-pns";
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

export interface SetPrimaryOpts {
  api: ApiPromise;
  signer: Signer;
  fromAddress: string;
  reverseRegistrar: string;
  fullName: string; // e.g. "romario.pot"
  onStep?: (s: string) => void;
}

/**
 * Set the caller's primary (reverse) name so `reverse(address)` returns it.
 *
 *   1. ReverseRegistrar.claim()        — own <hex>.addr.reverse + wire resolver
 *   2. ReverseRegistrar.set_name(name) — write the primary name record
 *
 * reverse() then forward-verifies (resolve(name).addr === address), so the
 * name must already have its forward addr record (minting sets it).
 */
export async function setPrimaryName(opts: SetPrimaryOpts): Promise<void> {
  const { api, signer, fromAddress, reverseRegistrar, fullName, onStep } = opts;
  const step = onStep ?? (() => {});

  step("Claiming reverse record…");
  await submitContractCall(
    api,
    signer,
    fromAddress,
    reverseRegistrar,
    0n,
    defaultSelector("claim"), // no args
  );

  step("Setting primary name…");
  await submitContractCall(
    api,
    signer,
    fromAddress,
    reverseRegistrar,
    0n,
    u8aConcat(defaultSelector("set_name"), scaleString(fullName)),
  );

  step("Done");
}

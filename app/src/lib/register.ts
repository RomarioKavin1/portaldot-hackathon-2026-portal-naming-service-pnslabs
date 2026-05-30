"use client";

import { ApiPromise } from "@polkadot/api";
import { blake2AsU8a, decodeAddress } from "@polkadot/util-crypto";
import { u8aConcat, hexToU8a } from "@polkadot/util";
import { buildCallData, defaultSelector, namehash, normalize } from "@portal-name/sdk";
import { signerForAddress } from "./wallet";

const PLANCK = 100_000_000_000_000n; // 1 POT = 10^14
const COIN_POT = 0xffff_0000;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const DEFAULT_GAS = 1_000_000_000_000n;

function priceQuotePlanck(nameLen: number, durationMs: number): bigint {
  const yearly = nameLen >= 5 ? 5n :
                 nameLen === 4 ? 40n :
                 nameLen === 3 ? 160n :
                 640n;
  return (yearly * PLANCK * BigInt(durationMs)) / BigInt(YEAR_MS);
}

function compactLen(n: number): Uint8Array {
  // SCALE compact for small lengths (n < 64): single byte = n << 2.
  if (n < 64) return new Uint8Array([n << 2]);
  if (n < 1 << 14) {
    const v = (n << 2) | 0x01;
    return new Uint8Array([v & 0xff, (v >> 8) & 0xff]);
  }
  throw new Error("compactLen: unsupported size " + n);
}

async function submit(
  api: ApiPromise,
  signer: any,
  fromAddress: string,
  dest: string,
  value: bigint,
  data: Uint8Array,
): Promise<void> {
  const tx = api.tx.contracts.call(dest, value, DEFAULT_GAS, "0x" + Buffer.from(data).toString("hex"));
  return new Promise((resolve, reject) => {
    tx.signAndSend(fromAddress, { signer }, ({ status, dispatchError }) => {
      if (dispatchError) {
        reject(new Error(String(dispatchError)));
        return;
      }
      if (status.isInBlock || status.isFinalized) resolve();
    }).catch(reject);
  });
}

export interface RegisterOpts {
  api: ApiPromise;
  fromAddress: string;          // signer (also: rent payer + owner of the name)
  controller: string;           // RegistrarController address
  registry: string;             // Registry address
  resolver: string;             // PublicResolver address
  rawName: string;              // pre-normalized; we re-normalize defensively
  durationMs?: number;          // default 60 days
  onStep?: (s: string) => void; // progress callback for the UI
}

/**
 * Full registration flow signed by a polkadot.js-extension account:
 *
 *   1. commit(blake2(name || owner || secret))
 *   2. register(name, owner, duration, secret)        [payable]
 *   3. Registry.set_resolver(name.pot, PublicResolver)
 *   4. PublicResolver.set_addr(name.pot, COIN_POT, owner_pubkey)
 *
 * Steps 3-4 are owner-gated and must be signed by the SAME account that
 * was passed as `owner` to register(). For simplicity that account IS
 * `fromAddress` — i.e. the signer registers a name to itself.
 */
export async function registerName(opts: RegisterOpts): Promise<{ node: Uint8Array; address: string }> {
  const { api, fromAddress, controller, registry, resolver, onStep } = opts;
  const step = onStep ?? (() => {});
  const name = normalize(opts.rawName.toLowerCase());
  const labelBytes = new TextEncoder().encode(name);
  const ownerPubkey = decodeAddress(fromAddress);
  const secret = new Uint8Array(32).fill(0x42);
  const durationMs = opts.durationMs ?? 60 * 24 * 60 * 60 * 1000;
  const signer = await signerForAddress(fromAddress);

  // 1. commit
  step("Committing…");
  const commitInput = u8aConcat(labelBytes, ownerPubkey, secret);
  const commitment = blake2AsU8a(commitInput, 256);
  await submit(api, signer, fromAddress,
    controller, 0n,
    buildCallData(defaultSelector("commit"), commitment),
  );

  // 2. register (payable)
  step("Registering…");
  const price = priceQuotePlanck(name.length, durationMs);
  const nameScale = u8aConcat(compactLen(labelBytes.length), labelBytes);
  const durBuf = new ArrayBuffer(8);
  new DataView(durBuf).setBigUint64(0, BigInt(durationMs), true);
  const regArgs = u8aConcat(nameScale, ownerPubkey, new Uint8Array(durBuf), secret);
  await submit(api, signer, fromAddress,
    controller, price + PLANCK,
    buildCallData(defaultSelector("register"), regArgs),
  );

  // 3. set_resolver
  step("Wiring resolver…");
  const node = namehash(`${name}.pot`);
  const resolverPubkey = decodeAddress(resolver);
  await submit(api, signer, fromAddress,
    registry, 0n,
    buildCallData(
      defaultSelector("set_resolver"),
      u8aConcat(node, new Uint8Array([0x01]), resolverPubkey),
    ),
  );

  // 4. set_addr
  step("Publishing address record…");
  const coinTypeBuf = new ArrayBuffer(4);
  new DataView(coinTypeBuf).setUint32(0, COIN_POT, true);
  const valScale = u8aConcat(compactLen(32), ownerPubkey);
  await submit(api, signer, fromAddress,
    resolver, 0n,
    buildCallData(
      defaultSelector("set_addr"),
      u8aConcat(node, new Uint8Array(coinTypeBuf), valScale),
    ),
  );

  step("Done");
  return { node, address: fromAddress };
}

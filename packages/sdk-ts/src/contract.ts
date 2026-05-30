import type { ApiPromise } from "@polkadot/api";
import { blake2AsU8a } from "@polkadot/util-crypto";
import { u8aToHex, u8aConcat, hexToU8a } from "@polkadot/util";

/**
 * Selector for an ink! 3.0.0-rc3 message: blake2_256(message_name)[0..4].
 *
 * Contract Cargo.toml-declared selectors override this — when we override on
 * the contract side, we use the same 4-byte literal here. For messages where
 * we don't override, this helper computes the default.
 */
export function defaultSelector(messageName: string): Uint8Array {
  return blake2AsU8a(messageName, 256).slice(0, 4);
}

/**
 * Build the `data` Bytes payload for a Contracts.call extrinsic targeting an
 * ink! 3.0.0-rc3 message: 4-byte selector + SCALE-encoded args (already
 * encoded by the caller).
 */
export function buildCallData(selector: Uint8Array | string, encodedArgs: Uint8Array): Uint8Array {
  const sel = typeof selector === "string" ? hexToU8a(selector) : selector;
  if (sel.length !== 4) throw new Error(`selector must be 4 bytes, got ${sel.length}`);
  return u8aConcat(sel, encodedArgs);
}

/**
 * Dry-run a read on a deployed contract via the `contracts_call` RPC.
 * Returns the contract's raw return bytes (SCALE-encoded as the contract
 * declared).
 *
 * `gasLimit` here is the old u64 Weight (this runtime has no Weight V2).
 *
 * Implementation note: @polkadot/api v16's high-level
 * `api.rpc.contracts.call(...)` wrapper injects a `storageDepositLimit`
 * field that Substrate 3.0.0's `contracts_call` rejects with -32602
 * Invalid params. We bypass the wrapper and hit the JSON-RPC method
 * directly with exactly the four fields the legacy runtime expects:
 * `origin, dest, value, gasLimit, inputData`.
 */
export async function dryRun(
  api: ApiPromise,
  origin: string,
  contractAddress: string,
  data: Uint8Array,
  gasLimit: bigint = 500_000_000_000n,
  value: bigint = 0n,
): Promise<Uint8Array> {
  // NumberOrHex: send as `0x<hex>` (Substrate 3.0.0 accepts either a number
  // or a hex string; hex always works regardless of magnitude).
  const params = {
    origin,
    dest: contractAddress,
    value: "0x" + value.toString(16),
    gasLimit: "0x" + gasLimit.toString(16),
    inputData: u8aToHex(data),
  };
  const res: any = await (api as any)._rpcCore.provider.send(
    "contracts_call",
    [params],
  );
  // Legacy result shape: { result: { Ok: { data: "0x...", flags } } | { Err: ... } }
  const result = res?.result;
  if (result?.Err !== undefined) {
    throw new Error(
      `contract dry-run failed: ${JSON.stringify(result.Err)}`,
    );
  }
  const okData = result?.Ok?.data;
  if (typeof okData === "string") return hexToU8a(okData);
  if (okData instanceof Uint8Array) return okData;
  throw new Error(
    `unrecognized dry-run shape: ${JSON.stringify(res).slice(0, 200)}`,
  );
}

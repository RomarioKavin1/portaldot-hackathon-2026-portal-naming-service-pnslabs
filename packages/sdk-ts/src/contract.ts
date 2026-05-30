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
 */
export async function dryRun(
  api: ApiPromise,
  origin: string,
  contractAddress: string,
  data: Uint8Array,
  gasLimit: bigint = 500_000_000_000n,
  value: bigint = 0n,
): Promise<Uint8Array> {
  // Portaldot's RPC method is `contracts_call` (legacy name). Argument
  // shape mirrors the extrinsic but expects an `origin` field.
  const res: any = await (api.rpc as any).contracts.call({
    origin,
    dest: contractAddress,
    value,
    gasLimit,
    inputData: u8aToHex(data),
  });
  // The legacy result shape is { result: { Ok: { data: Bytes, flags } } | { Err: ... } }
  if (res?.result?.isErr || res?.result?.Err !== undefined) {
    throw new Error(`contract dry-run failed: ${JSON.stringify(res.result?.Err ?? res.result)}`);
  }
  const ok = res?.result?.Ok ?? res?.result;
  const dataField = ok?.data ?? ok?.toJSON?.()?.data ?? ok;
  if (dataField instanceof Uint8Array) return dataField;
  if (typeof dataField === "string") return hexToU8a(dataField);
  // Last resort: try to find a hex field in the result.
  throw new Error(`unrecognized dry-run shape: ${JSON.stringify(res?.toHuman?.() ?? res)}`);
}

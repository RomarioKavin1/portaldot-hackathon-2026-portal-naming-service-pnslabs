import { PnsConnection, PnsConfig } from "./connection.js";
import { namehash } from "./namehash.js";
import { normalize } from "./normalize.js";
import { buildCallData, defaultSelector, dryRun } from "./contract.js";
import { TypeRegistry } from "@polkadot/types";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";

/**
 * `//Alice` on the SS58-format-42 dev node. Hard-coded to avoid pulling in
 * @polkadot/keyring as a dep just for a well-known dry-run origin. Verified
 * in rpc.md.
 */
const ALICE_DEV_ADDR = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

/**
 * ink! 3.0.0-rc3 default message selectors = blake2_256(name)[..4]. We
 * pre-compute the ones the client uses so the hot path doesn't hash on
 * every call. Identical to `scripts/selectors.py`.
 */
const SEL_RESOLVER    = defaultSelector("resolver");     // Registry.resolver
const SEL_ADDR        = defaultSelector("addr");         // PublicResolver.addr
const SEL_NAME        = defaultSelector("name");         // PublicResolver.name

/** SLIP-0044-style id reserved for the native Portaldot SS58 address. */
export const COIN_POT = 0xffff_0000;

/**
 * High-level PNS client. Wraps the chain connection + the four core
 * contracts and enforces two non-negotiable invariants from spec §8:
 *
 *   1. Input names are normalized BEFORE hashing — `resolve("Alice.POT")`
 *      maps to the same node as `resolve("alice.pot")` and we never expose
 *      a hash of a non-normalized label.
 *   2. Reverse resolution is forward-verified — `reverse(addr)` only returns
 *      a name if `resolve(name).addr === addr`. Spoofed reverse records are
 *      silently dropped.
 */
export class PnsClient {
  private constructor(private conn: PnsConnection) {}

  static async connect(cfg: PnsConfig): Promise<PnsClient> {
    return new PnsClient(await PnsConnection.open(cfg));
  }

  async disconnect(): Promise<void> {
    await this.conn.close();
  }

  /** Underlying open connection (for advanced callers). */
  get connection(): PnsConnection { return this.conn; }

  // ====================================================================
  // forward resolution
  // ====================================================================

  /**
   * `name -> SS58 address` via the canonical record at
   * `addr(node, COIN_POT)`. Returns null if the name is unowned, unresolved,
   * or has no `addr` record for COIN_POT.
   *
   * @throws NormalizeError when `name` cannot be normalized.
   */
  async resolve(name: string): Promise<string | null> {
    const normalized = normalize(name);
    const node = namehash(normalized);

    // 1. Registry.resolver(node) — selector matches contracts/registry/lib.rs
    //    explicit override. Until we lock the selector layout, attempt the
    //    overridden 4-byte literal first.
    const registry = this.conn.contracts.registry;
    const resolverAddr = await this.registryResolver(registry, node);
    if (!resolverAddr) return null;

    // 2. PublicResolver.addr(node, COIN_POT)
    return await this.resolverAddr(resolverAddr, node, COIN_POT);
  }

  // ====================================================================
  // reverse resolution
  // ====================================================================

  /**
   * `address -> name` with mandatory forward-verification. If the reverse
   * record points to a name, we re-resolve that name and confirm the
   * forward `addr` matches; otherwise null.
   */
  async reverse(address: string): Promise<string | null> {
    if (!this.conn.contracts.reverseRegistrar) return null;
    const pubkey = decodeAddress(address);
    // <addr>.addr.reverse — labelhash is blake2_256 of the lowercase hex
    // pubkey (28 chars for Substrate AccountId32 SS58 addresses follow the
    // ENS convention — we adopt the same shape: hex without 0x prefix).
    // Build node = namehash("<hex>.addr.reverse").
    const hex = Array.from(pubkey)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const node = namehash(`${hex}.addr.reverse`);

    const resolverAddr = await this.registryResolver(
      this.conn.contracts.registry, node,
    );
    if (!resolverAddr) return null;

    const claimedName = await this.resolverName(resolverAddr, node);
    if (!claimedName) return null;

    // Forward-verify.
    const forward = await this.resolve(claimedName);
    if (forward && forward === address) return claimedName;
    return null;
  }

  // ====================================================================
  // internals — each calls one contract via dry-run + selector
  // ====================================================================

  /** Registry.resolver(node) -> Option<AccountId>. */
  private async registryResolver(registry: string, node: Uint8Array): Promise<string | null> {
    const data = buildCallData(SEL_RESOLVER, node);
    const out = await dryRun(this.conn.api, ALICE_DEV_ADDR, registry, data);
    // SCALE-decode Option<AccountId32>. Option byte 0 = None, 1 = Some(32).
    if (out.length === 0 || out[0] === 0) return null;
    if (out.length < 33) return null;
    return encodeAddress(out.slice(1, 33), this.conn.ss58Format);
  }

  /** PublicResolver.addr(node, coin_type) -> Option<Vec<u8>>. */
  private async resolverAddr(resolver: string, node: Uint8Array, coinType: number): Promise<string | null> {
    // ink! 3.0.0-rc3 encodes args sequentially with no tuple wrapper:
    // selector(4) + node(32 raw) + coin_type(4 LE).
    const args = new Uint8Array(32 + 4);
    args.set(node, 0);
    new DataView(args.buffer).setUint32(32, coinType, true);
    const data = buildCallData(SEL_ADDR, args);
    const out = await dryRun(this.conn.api, ALICE_DEV_ADDR, resolver, data);
    if (out.length === 0 || out[0] === 0) return null;
    // For COIN_POT we know the value bytes are an SS58 pubkey (32 bytes).
    const reg = new TypeRegistry();
    const vec = reg.createType("Vec<u8>", out.slice(1));
    const bytes = vec.toU8a(true);
    if (bytes.length === 32) return encodeAddress(bytes, this.conn.ss58Format);
    return u8aToHex(bytes);
  }

  /** PublicResolver.name(node) -> Option<String>. */
  private async resolverName(resolver: string, node: Uint8Array): Promise<string | null> {
    const data = buildCallData(SEL_NAME, node);
    const out = await dryRun(this.conn.api, ALICE_DEV_ADDR, resolver, data);
    if (out.length === 0 || out[0] === 0) return null;
    const reg = new TypeRegistry();
    const s = reg.createType("Text", out.slice(1));
    return s.toString();
  }
}

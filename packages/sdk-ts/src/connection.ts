import { ApiPromise, WsProvider } from "@polkadot/api";
import { NETWORKS, type NetworkName, type PnsNetwork } from "./networks.js";

export interface PnsContractAddresses {
  registry: string;
  potRegistrar: string;
  registrarController: string;
  publicResolver: string;
  reverseRegistrar?: string;
  subnameRegistrar?: string;
}

export interface PnsConfig {
  /**
   * Named preset to start from. `"devnet"` (the default) bundles a working
   * deployment; `"mainnet"` sets the mainnet RPC but expects you to supply
   * `contracts`.
   */
  network?: NetworkName;
  /**
   * Override the RPC endpoint — point this at your own node, a custom
   * gateway, or mainnet. Falls back to the chosen network's default URL.
   */
  url?: string;
  /**
   * Deployed contract addresses (SS58). Optional when the chosen `network`
   * bundles them (e.g. `devnet`); required otherwise. Any addresses you pass
   * are merged over the preset's, so you can override just one.
   */
  contracts?: Partial<PnsContractAddresses>;
  /** SS58 prefix override. Defaults to the network's value (Portaldot = 42). */
  ss58Format?: number;
}

/** Contracts that must be present for the client to function. */
const REQUIRED_CONTRACTS = [
  "registry",
  "potRegistrar",
  "registrarController",
  "publicResolver",
] as const;

/**
 * Thin wrapper around an open @polkadot/api connection.
 *
 * Portaldot ships pre-V14 metadata (spec 1002, "substrate-node-template"
 * lineage), so type augmentation may eventually be needed for full decode of
 * legacy events. For the v1 SDK surface (Contracts.call + RPC dry-run +
 * Balances.transfer) the default registry suffices because every type we
 * touch is in core.json or constructed by hand. Mainnet runs the identical
 * runtime, so the same code path works there — just point `url` at it.
 */
export class PnsConnection {
  private constructor(
    public readonly api: ApiPromise,
    public readonly contracts: PnsContractAddresses,
    public readonly ss58Format: number,
  ) {}

  static async open(cfg: PnsConfig = {}): Promise<PnsConnection> {
    const net: PnsNetwork = NETWORKS[cfg.network ?? "devnet"];
    const url = cfg.url ?? net.url;
    const ss58Format = cfg.ss58Format ?? net.ss58Format;
    const contracts = {
      ...(net.contracts ?? {}),
      ...(cfg.contracts ?? {}),
    } as PnsContractAddresses;

    const missing = REQUIRED_CONTRACTS.filter((k) => !contracts[k]);
    if (missing.length > 0) {
      const hint =
        cfg.network === "mainnet"
          ? `Network "mainnet" has no PNS deployment bundled yet — pass { contracts: { ... } } with your deployed addresses.`
          : `Pass { contracts: { ... } } with your deployed addresses, or use { network: "devnet" } for the bundled deployment.`;
      throw new Error(
        `PNS: missing required contract address(es): ${missing.join(", ")}. ${hint}`,
      );
    }

    const provider = new WsProvider(url);
    const api = await ApiPromise.create({ provider });
    return new PnsConnection(api, contracts, ss58Format);
  }

  async close(): Promise<void> {
    await this.api.disconnect();
  }
}

import { ApiPromise, WsProvider } from "@polkadot/api";

export interface PnsContractAddresses {
  registry: string;
  potRegistrar: string;
  registrarController: string;
  publicResolver: string;
  reverseRegistrar?: string;
  subnameRegistrar?: string;
}

export interface PnsConfig {
  /** WebSocket URL (default Portaldot dev node). */
  url?: string;
  /** Deployed contract addresses (SS58). */
  contracts: PnsContractAddresses;
  /** SS58 prefix — Portaldot uses 42. */
  ss58Format?: number;
}

const DEFAULT_URL = "wss://portaldot.philotheephilix.in";

/**
 * Thin wrapper around an open @polkadot/api connection.
 *
 * Portaldot ships pre-V14 metadata (spec 1002, "substrate-node-template"
 * lineage), so type augmentation may eventually be needed for full decode of
 * legacy events. For the v1 SDK surface (Contracts.call + RPC dry-run +
 * Balances.transfer) the default registry suffices because every type we
 * touch is in core.json or constructed by hand.
 */
export class PnsConnection {
  private constructor(
    public readonly api: ApiPromise,
    public readonly contracts: PnsContractAddresses,
    public readonly ss58Format: number,
  ) {}

  static async open(cfg: PnsConfig): Promise<PnsConnection> {
    const provider = new WsProvider(cfg.url ?? DEFAULT_URL);
    const api = await ApiPromise.create({ provider });
    return new PnsConnection(api, cfg.contracts, cfg.ss58Format ?? 42);
  }

  async close(): Promise<void> {
    await this.api.disconnect();
  }
}

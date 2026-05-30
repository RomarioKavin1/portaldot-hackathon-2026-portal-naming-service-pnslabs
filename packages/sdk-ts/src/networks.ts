import type { PnsContractAddresses } from "./connection.js";

export interface PnsNetwork {
  /** Human-readable label. */
  name: string;
  /** Default WebSocket RPC endpoint. */
  url: string;
  /** SS58 address prefix (Portaldot uses 42). */
  ss58Format: number;
  /** Canonical contract addresses, if a known deployment exists. */
  contracts?: PnsContractAddresses;
}

/**
 * Known Portaldot networks.
 *
 * `devnet` ships with the current dev-node deployment baked in, so the SDK
 * works with zero configuration — but the dev node **resets on restart**, so
 * treat these addresses as best-effort and override them if resolution stops
 * working.
 *
 * `mainnet` (and any private node) has no canonical PNS deployment baked in
 * yet — pass your own `contracts` when connecting. See the README.
 */
export const NETWORKS = {
  devnet: {
    name: "Portaldot Devnet",
    url: "wss://portaldot.philotheephilix.in",
    ss58Format: 42,
    contracts: {
      registry: "5Gg7tZDAPRUyoouUzeM1oo3K4migHxH31gcgXUqLS1AoErcZ",
      potRegistrar: "5CrbQmNr1YcPgjrF2c3pvkHHnnheG6tdKY99feUiy2qXA39c",
      registrarController: "5D1Pj1T7J6EBGZwfwxHJzRoT3JcC1i4ED2zif7Rh8ZNsignf",
      publicResolver: "5EUMJavvFLtDvFtK7JHYfauokoeRcw5kaV8AkEgJuNi7Uiak",
      reverseRegistrar: "5HhhKUnTgSbk1wbhgmsnnE9QxiKEwL3qR7UGLt5t6wgZikGb",
      subnameRegistrar: "5H7YJVJv9wrzHdAQmy6dqGJTgEBQWbkTx3HhQvgdo3yGdXek",
    },
  },
  mainnet: {
    name: "Portaldot Mainnet",
    url: "wss://mainnet.portaldot.io",
    ss58Format: 42,
    // No canonical PNS deployment yet — supply `contracts` when connecting.
  },
} satisfies Record<string, PnsNetwork>;

/** Names of the built-in network presets. */
export type NetworkName = keyof typeof NETWORKS;

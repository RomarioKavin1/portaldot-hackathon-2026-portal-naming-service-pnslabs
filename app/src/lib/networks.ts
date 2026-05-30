/**
 * Network registry for the dApp. Two targets: a live testnet (the Portaldot
 * dev node) and mainnet. Mainnet is wired but `ready` only flips true once its
 * contract addresses are provided via env — drop them in and the switch
 * activates with no further code changes.
 */

export type NetworkKey = "testnet" | "mainnet";

export interface NetworkContracts {
  registry: string;
  potRegistrar: string;
  registrarController: string;
  publicResolver: string;
  reverseRegistrar: string;
}

export interface NetworkDef {
  key: NetworkKey;
  label: string;
  url: string;
  contracts: NetworkContracts;
  /** True when this network has a complete contract deployment configured. */
  ready: boolean;
}

function complete(c: NetworkContracts): boolean {
  return Boolean(
    c.registry && c.potRegistrar && c.registrarController && c.publicResolver,
  );
}

const TESTNET_CONTRACTS: NetworkContracts = {
  registry: process.env.NEXT_PUBLIC_PNS_REGISTRY ?? "",
  potRegistrar: process.env.NEXT_PUBLIC_PNS_POT_REGISTRAR ?? "",
  registrarController: process.env.NEXT_PUBLIC_PNS_REGISTRAR_CONTROLLER ?? "",
  publicResolver: process.env.NEXT_PUBLIC_PNS_PUBLIC_RESOLVER ?? "",
  reverseRegistrar: process.env.NEXT_PUBLIC_PNS_REVERSE_REGISTRAR ?? "",
};

const MAINNET_CONTRACTS: NetworkContracts = {
  registry: process.env.NEXT_PUBLIC_PNS_MAINNET_REGISTRY ?? "",
  potRegistrar: process.env.NEXT_PUBLIC_PNS_MAINNET_POT_REGISTRAR ?? "",
  registrarController:
    process.env.NEXT_PUBLIC_PNS_MAINNET_REGISTRAR_CONTROLLER ?? "",
  publicResolver: process.env.NEXT_PUBLIC_PNS_MAINNET_PUBLIC_RESOLVER ?? "",
  reverseRegistrar: process.env.NEXT_PUBLIC_PNS_MAINNET_REVERSE_REGISTRAR ?? "",
};

export const NETWORKS: Record<NetworkKey, NetworkDef> = {
  testnet: {
    key: "testnet",
    label: "Testnet",
    url:
      process.env.NEXT_PUBLIC_PORTALDOT_WSS ??
      "wss://portaldot.philotheephilix.in",
    contracts: TESTNET_CONTRACTS,
    ready: complete(TESTNET_CONTRACTS),
  },
  mainnet: {
    key: "mainnet",
    label: "Mainnet",
    url: process.env.NEXT_PUBLIC_PORTALDOT_MAINNET_WSS ?? "wss://mainnet.portaldot.io",
    contracts: MAINNET_CONTRACTS,
    ready: complete(MAINNET_CONTRACTS),
  },
};

export const NETWORK_ORDER: NetworkKey[] = ["testnet", "mainnet"];
export const DEFAULT_NETWORK: NetworkKey = "testnet";

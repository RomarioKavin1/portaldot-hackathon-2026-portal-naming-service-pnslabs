"use client";

import { PnsClient } from "portaldot-pns";

/**
 * Deployed contract addresses for the current target network.
 *
 * TEMP: filled in by hand after `scripts/deploy_pns.py` runs. Move to env
 * vars (NEXT_PUBLIC_*) when we have a non-resetting testnet.
 */
const CONTRACTS = {
  registry: process.env.NEXT_PUBLIC_PNS_REGISTRY ?? "",
  potRegistrar: process.env.NEXT_PUBLIC_PNS_POT_REGISTRAR ?? "",
  registrarController: process.env.NEXT_PUBLIC_PNS_REGISTRAR_CONTROLLER ?? "",
  publicResolver: process.env.NEXT_PUBLIC_PNS_PUBLIC_RESOLVER ?? "",
  reverseRegistrar: process.env.NEXT_PUBLIC_PNS_REVERSE_REGISTRAR ?? "",
};

const URL = process.env.NEXT_PUBLIC_PORTALDOT_WSS
  ?? "wss://portaldot.philotheephilix.in";

let cached: Promise<PnsClient> | null = null;

export function getClient(): Promise<PnsClient> {
  if (!cached) {
    cached = PnsClient.connect({ url: URL, contracts: CONTRACTS });
  }
  return cached;
}

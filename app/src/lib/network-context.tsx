"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { PnsClient } from "portaldot-pns";
import {
  DEFAULT_NETWORK,
  NETWORKS,
  type NetworkDef,
  type NetworkKey,
} from "@/lib/networks";

/** One cached client per network, created lazily on first use. */
const clients = new Map<NetworkKey, Promise<PnsClient>>();

export function clientFor(net: NetworkDef): Promise<PnsClient> {
  let c = clients.get(net.key);
  if (!c) {
    c = PnsClient.connect({ url: net.url, contracts: net.contracts });
    clients.set(net.key, c);
  }
  return c;
}

interface NetworkCtx {
  net: NetworkDef;
  netKey: NetworkKey;
  setNetwork: (key: NetworkKey) => void;
  getClient: () => Promise<PnsClient>;
}

const Ctx = createContext<NetworkCtx | null>(null);
const STORAGE_KEY = "pns:network";

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [netKey, setNetKey] = useState<NetworkKey>(DEFAULT_NETWORK);

  // Restore a previously chosen, still-ready network after hydration.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as NetworkKey | null;
    if (saved && NETWORKS[saved]?.ready) setNetKey(saved);
  }, []);

  const setNetwork = useCallback((key: NetworkKey) => {
    if (!NETWORKS[key]?.ready) return; // never switch to an unconfigured network
    setNetKey(key);
    window.localStorage.setItem(STORAGE_KEY, key);
  }, []);

  const net = NETWORKS[netKey];
  const getClient = useCallback(() => clientFor(net), [net]);

  const value = useMemo<NetworkCtx>(
    () => ({ net, netKey, setNetwork, getClient }),
    [net, netKey, setNetwork, getClient],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNetwork(): NetworkCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNetwork must be used within NetworkProvider");
  return ctx;
}

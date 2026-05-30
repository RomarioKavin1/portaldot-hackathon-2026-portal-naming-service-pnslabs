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

/** One cached client per network, created lazily on first use. Invalidated
 *  whenever the underlying WS drops so a stale, disconnected api can't hang
 *  the next call indefinitely. */
const clients = new Map<NetworkKey, Promise<PnsClient>>();

export function clientFor(net: NetworkDef): Promise<PnsClient> {
  const existing = clients.get(net.key);
  if (existing) {
    // Fast-path: defensively probe the resolved api in case the disconnect
    // event was missed. If it really is down, evict and rebuild on next call.
    return existing.then((client) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api: any = (client as any)?.connection?.api;
      if (api && api.isConnected === false) {
        if (clients.get(net.key) === existing) clients.delete(net.key);
        return clientFor(net);
      }
      return client;
    });
  }

  // `built` is captured per-call so the `drop` closure invalidates the right
  // promise even if multiple networks build concurrently or a later call
  // already replaced us.
  const built: Promise<PnsClient> = (async () => {
    const client = await PnsClient.connect({ url: net.url, contracts: net.contracts });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api: any = (client as any)?.connection?.api;
    if (api?.on) {
      const drop = () => {
        if (clients.get(net.key) === built) clients.delete(net.key);
      };
      api.on("disconnected", drop);
      api.on("error", drop);
    }
    return client;
  })();

  clients.set(net.key, built);
  return built;
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

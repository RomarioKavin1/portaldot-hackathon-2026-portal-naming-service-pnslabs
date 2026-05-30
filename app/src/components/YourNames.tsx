"use client";

import { useCallback, useEffect, useState } from "react";
import { useNetwork } from "@/lib/network-context";
import { useSubstrateAccount } from "@/lib/use-account";
import { createPrivySigner } from "@/lib/privy-signer";
import { setPrimaryName } from "@/lib/reverse";
import { getOwnedNames, onOwnedNamesChanged } from "@/lib/owned-names";
import { Button } from "@/components/ui";

export function YourNames() {
  const { net, getClient } = useNetwork();
  const { authenticated, address, wallet, signMessage } = useSubstrateAccount();
  const [names, setNames] = useState<string[]>([]);
  const [primary, setPrimary] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setNames(address ? getOwnedNames(address) : []);
  }, [address]);

  useEffect(() => refresh(), [refresh]);
  useEffect(() => onOwnedNamesChanged(refresh), [refresh]);

  // Which name is currently the primary (reverse) record?
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!address || !net.ready || names.length === 0) return;
      try {
        const client = await getClient();
        const p = await client.reverse(address);
        if (alive) setPrimary(p);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [address, net, getClient, names.length]);

  if (!authenticated || !address || names.length === 0) return null;

  const makePrimary = async (fullName: string) => {
    if (!wallet) return;
    setError(null);
    setBusy(fullName);
    try {
      const client = await getClient();
      const api = client.connection.api;
      const signer = createPrivySigner(api, wallet, signMessage);
      await setPrimaryName({
        api,
        signer,
        fromAddress: address,
        reverseRegistrar: net.contracts.reverseRegistrar,
        fullName,
      });
      setPrimary(fullName);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-14">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="font-mono text-lg text-ink">Your names</h2>
        <span className="text-xs text-ink-faint">
          {names.length} on {net.label.toLowerCase()}
        </span>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {names.map((n) => {
          const isPrimary = primary === n;
          return (
            <li key={n} className="flex items-center justify-between gap-3 px-5 py-4">
              <span className="font-mono text-ink">
                {n.replace(/\.pot$/, "")}
                <span className="text-accent-ink">.pot</span>
              </span>
              {isPrimary ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-ok">
                  <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                  Primary
                </span>
              ) : (
                <Button
                  variant="ghost"
                  loading={busy === n}
                  disabled={busy !== null}
                  onClick={() => makePrimary(n)}
                  className="px-3 py-1.5 text-xs"
                >
                  Set as primary
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="mt-2.5 rounded-xl border border-danger/40 bg-danger-soft/40 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      <p className="mt-2.5 text-xs text-ink-faint">
        Setting a primary name lets <span className="font-mono">Look up an address</span>{" "}
        resolve back to it (forward-verified).
      </p>
    </section>
  );
}

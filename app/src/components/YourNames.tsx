"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useNetwork } from "@/lib/network-context";
import { useSubstrateAccount } from "@/lib/use-account";
import { createPrivySigner } from "@/lib/privy-signer";
import { setPrimaryName } from "@/lib/reverse";
import { getOwnedNames, onOwnedNamesChanged } from "@/lib/owned-names";
import { Btn } from "@/components/ui";
import { NameTag, ShieldDoodle } from "@/components/doodles";

interface Props {
  variant?: "teaser" | "full";
}

export function YourNames({ variant = "teaser" }: Props) {
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

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!address || !net.ready) return;
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

  if (!authenticated || !address) return null;
  if (variant === "teaser" && names.length === 0) return null;

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
        registry: net.contracts.registry,
        publicResolver: net.contracts.publicResolver,
        fullName,
      });
      setPrimary(fullName);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (variant === "teaser") {
    return (
      <div className="panel" style={{ padding: "22px 26px" }}>
        <div className="row spread" style={{ marginBottom: 16 }}>
          <h3 className="h2" style={{ fontSize: 22, margin: 0 }}>Your names</h3>
          <Link href="/names" style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", textDecoration: "none" }}>
            Manage all →
          </Link>
        </div>
        <div className="row gap-12" style={{ flexWrap: "wrap" }}>
          {names.map((n) => (
            <Link
              key={n}
              href={`/manage/${encodeURIComponent(n)}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className="row gap-10"
                style={{
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1.5px solid var(--line)",
                  cursor: "pointer",
                }}
              >
                <div className="display" style={{ fontSize: 18 }}>{n}</div>
                {primary === n && (
                  <span className="tag tag-ink" style={{ fontSize: 10, padding: "3px 8px" }}>
                    primary
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
        {error && (
          <p className="body-txt" style={{ fontSize: 13, color: "#8a2a25", marginTop: 12 }}>{error}</p>
        )}
      </div>
    );
  }

  // full variant — used on /names
  if (names.length === 0) {
    return (
      <div className="card card-blush" style={{ padding: "48px 40px", textAlign: "center" }}>
        <div style={{ display: "grid", placeItems: "center", marginBottom: 10 }}>
          <NameTag size={110} />
        </div>
        <h3 className="display" style={{ fontSize: 30, margin: "0 0 10px" }}>No names yet</h3>
        <p className="lead" style={{ maxWidth: 380, margin: "0 auto 22px" }}>
          You haven&apos;t minted any names from this browser yet. The chain has no owner→names index, so this list only tracks browser-minted names.
        </p>
        <Link href="/">
          <Btn variant="dark" size="btn-lg">Register your first name</Btn>
        </Link>
      </div>
    );
  }

  const primaryName = names.find((n) => n === primary);

  return (
    <div>
      {primaryName && (
        <div
          className="card card-mint"
          style={{
            padding: "24px 28px",
            marginBottom: 22,
            display: "flex",
            gap: 22,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <ShieldDoodle size={70} accent="#FBFAF8" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="eyebrow">Primary identity · what the ecosystem shows</div>
            <div className="display" style={{ fontSize: 38, marginTop: 6 }}>{primaryName}</div>
          </div>
          <Link href={`/manage/${encodeURIComponent(primaryName)}`}>
            <Btn variant="ghost">Manage</Btn>
          </Link>
        </div>
      )}

      <div className="col gap-14">
        {names.map((n) => {
          const isPrimary = primary === n;
          return (
            <div
              key={n}
              className="card card-paper"
              style={{
                padding: "20px 24px",
                border: "1.5px solid var(--line)",
                display: "flex",
                alignItems: "center",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: isPrimary ? "var(--mint)" : "var(--peach)",
                  display: "grid",
                  placeItems: "center",
                  flex: "0 0 auto",
                }}
              >
                <NameTag size={44} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div className="row gap-8" style={{ alignItems: "center" }}>
                  <span className="display" style={{ fontSize: 24 }}>{n}</span>
                  {isPrimary && (
                    <span className="tag tag-ink" style={{ fontSize: 10 }}>primary</span>
                  )}
                </div>
                <div className="row gap-12" style={{ marginTop: 5 }}>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                    minted from this browser
                  </span>
                </div>
              </div>
              <div className="row gap-8">
                {!isPrimary && (
                  <Btn
                    variant="ghost"
                    size="btn-sm"
                    loading={busy === n}
                    disabled={busy !== null}
                    onClick={() => makePrimary(n)}
                  >
                    Set primary
                  </Btn>
                )}
                <Link href={`/manage/${encodeURIComponent(n)}`}>
                  <Btn variant="dark" size="btn-sm">Manage</Btn>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p
          className="body-txt"
          style={{ fontSize: 13, color: "#8a2a25", marginTop: 14, padding: "10px 14px", background: "#FCEFEE", borderRadius: 12 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

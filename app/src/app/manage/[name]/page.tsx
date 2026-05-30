"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Addr, Btn, Eyebrow, KV, RecordRow, Seg, useToast } from "@/components/ui";
import {
  CoinStack,
  LockDoodle,
  NameTag,
  ShieldDoodle,
  SketchDefs,
  Sparkle,
  TreeDoodle,
} from "@/components/doodles";
import { useNetwork } from "@/lib/network-context";
import { useSubstrateAccount } from "@/lib/use-account";
import { createPrivySigner } from "@/lib/privy-signer";
import { setPrimaryName } from "@/lib/reverse";
import { getOwnedNames } from "@/lib/owned-names";

const TEXT_FIELDS = [
  { key: "description", label: "Bio", glyph: "“”", placeholder: "Say something about this name" },
  { key: "url", label: "Website", glyph: "↗", placeholder: "https://" },
  { key: "com.twitter", label: "Twitter", glyph: "@", placeholder: "@handle" },
  { key: "avatar", label: "Avatar", glyph: "◎", placeholder: "ipfs:// or https://" },
];

export default function ManagePage() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const fullName = decodeURIComponent(params.name as string);
  const { net, getClient } = useNetwork();
  const { address, wallet, signMessage } = useSubstrateAccount();
  const [tab, setTab] = useState<"records" | "subnames" | "reverse">("records");
  const [resolvedAddr, setResolvedAddr] = useState<string | null>(null);
  const [primary, setPrimary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toastNode, toast] = useToast();

  const isOwned = !!address && getOwnedNames(address).includes(fullName);
  const readonly = !isOwned;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!net.ready) return;
      setLoading(true);
      try {
        const client = await getClient();
        const a = await client.resolve(fullName);
        if (!alive) return;
        setResolvedAddr(a);
        if (address) {
          const p = await client.reverse(address);
          if (alive) setPrimary(p);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fullName, net, getClient, address]);

  const isPrimary = primary === fullName;

  const makePrimary = async () => {
    if (!wallet || !address) return;
    setBusy(true);
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
      toast(`${fullName} is now your primary name`);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SketchDefs />
      <SiteHeader />
      <main className="view-in">
        <div className="wrap" style={{ paddingTop: 34, paddingBottom: 8 }}>
          <button
            onClick={() => router.push("/")}
            className="row gap-8"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-soft)",
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 16,
              alignItems: "center",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10 4l-4 4 4 4" />
            </svg>
            Back to search
          </button>
          <div className="row spread" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 className="display" style={{ fontSize: "clamp(40px,5vw,60px)", margin: 0 }}>
                {fullName}
              </h1>
              {readonly && (
                <p className="lead" style={{ marginTop: 12, maxWidth: 520 }}>
                  You&apos;re viewing a name you don&apos;t own — records are read-only.
                </p>
              )}
            </div>
            <div className="row gap-10" style={{ alignItems: "center" }}>
              {isPrimary && <span className="tag tag-ink">primary name</span>}
              {resolvedAddr && <span className="tag tag-ok">registered</span>}
            </div>
          </div>
        </div>

        <div className="wrap" style={{ marginTop: 10 }}>
          {/* identity strip */}
          <div
            className="card card-paper"
            style={{
              padding: "20px 24px",
              border: "1.5px solid var(--line)",
              marginBottom: 22,
              display: "flex",
              gap: 20,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "var(--blush)",
                display: "grid",
                placeItems: "center",
                flex: "0 0 auto",
              }}
            >
              <NameTag size={48} />
            </div>
            <KV k="Resolves to">
              {loading ? (
                <span className="body-txt" style={{ fontSize: 13 }}>…</span>
              ) : resolvedAddr ? (
                <Addr value={resolvedAddr} chars={6} />
              ) : (
                <span className="body-txt" style={{ fontSize: 13 }}>no address record</span>
              )}
            </KV>
            <KV k="Owner">
              {isOwned && address ? <Addr value={address} chars={6} /> : <span className="body-txt" style={{ fontSize: 13 }}>—</span>}
            </KV>
            <KV k="Resolver">
              <span className="chip" style={{ fontSize: 11 }}>public_resolver</span>
            </KV>
            <div className="wgrow" />
            {!readonly && !isPrimary && (
              <Btn variant="ghost" size="btn-sm" loading={busy} onClick={makePrimary}>
                Set as primary
              </Btn>
            )}
          </div>

          <div className="row spread" style={{ marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <Seg
              options={[
                { id: "records", label: "Records" },
                { id: "subnames", label: "Subnames" },
                { id: "reverse", label: "Primary" },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>

          {tab === "records" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
              <div className="panel" style={{ padding: "22px 24px" }}>
                <div className="row spread" style={{ marginBottom: 16 }}>
                  <h3 className="h2" style={{ fontSize: 20, margin: 0 }}>Address records</h3>
                  <CoinStack size={40} />
                </div>
                <div className="col gap-16">
                  <RecordRow
                    icon={<span className="display" style={{ fontSize: 12 }}>POT</span>}
                    k="Portaldot"
                    value={resolvedAddr || ""}
                    placeholder="POT address"
                    locked
                  />
                </div>
                <p className="body-txt" style={{ fontSize: 12.5, marginTop: 14, color: "var(--ink-faint)" }}>
                  Multi-coin records and editing are a v1.1 deliverable — UI ready, chain wiring in progress.
                </p>
              </div>
              <div className="panel" style={{ padding: "22px 24px" }}>
                <div className="row spread" style={{ marginBottom: 16 }}>
                  <h3 className="h2" style={{ fontSize: 20, margin: 0 }}>Text records</h3>
                  <span style={{ color: "var(--ink-soft)" }}>
                    <Sparkle size={26} />
                  </span>
                </div>
                <div className="col gap-16">
                  {TEXT_FIELDS.map((t) => (
                    <RecordRow
                      key={t.key}
                      mono={false}
                      icon={<span style={{ fontSize: 15 }}>{t.glyph}</span>}
                      k={t.label}
                      value=""
                      placeholder={t.placeholder}
                      locked
                    />
                  ))}
                </div>
                <p className="body-txt" style={{ fontSize: 12.5, marginTop: 14, color: "var(--ink-faint)" }}>
                  Public resolver text records ship next — preview only.
                </p>
              </div>
            </div>
          )}

          {tab === "subnames" && (
            <div className="panel" style={{ padding: "24px 26px" }}>
              <div className="row spread" style={{ alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 16 }}>
                <div style={{ maxWidth: 460 }}>
                  <h3 className="h2" style={{ fontSize: 22, margin: "0 0 6px" }}>Programmable subnames</h3>
                  <p className="body-txt" style={{ fontSize: 14, margin: 0 }}>
                    Mint <span className="mono" style={{ fontWeight: 700, color: "var(--ink)" }}>label.{fullName}</span> and delegate it. Burn a fuse to <b>permanently</b> lock a capability.
                  </p>
                </div>
                <TreeDoodle size={76} />
              </div>
              <div className="col" style={{ alignItems: "center", padding: "30px 0", gap: 12, opacity: 0.7 }}>
                <LockDoodle size={60} />
                <span className="body-txt" style={{ fontSize: 14 }}>
                  Subname minting + fuses ship in v1.1 — UI ready, chain wiring in progress.
                </span>
              </div>
            </div>
          )}

          {tab === "reverse" && (
            <div
              className="card card-peach"
              style={{
                padding: "30px 32px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 28,
                alignItems: "center",
              }}
            >
              <div style={{ maxWidth: 520 }}>
                <Eyebrow>Reverse record · account → name</Eyebrow>
                <h3 className="display" style={{ fontSize: 30, margin: "12px 0 8px" }}>
                  {isPrimary ? "This is your primary name." : "Make this your primary name."}
                </h3>
                <p className="body-txt" style={{ fontSize: 15 }}>
                  A primary name is what wallets and dApps show <i>instead</i> of your address. We claim{" "}
                  <span className="mono" style={{ color: "var(--ink)", fontWeight: 700 }}>{"<hex>"}.addr.reverse</span>,
                  set the resolver, then write the name — and it&apos;s forward-verified so it can&apos;t be spoofed.
                </p>
                {!readonly && (
                  <div style={{ marginTop: 20 }}>
                    {isPrimary ? (
                      <span className="tag tag-ink" style={{ fontSize: 13, padding: "9px 16px" }}>
                        Primary set & verified
                      </span>
                    ) : (
                      <Btn variant="dark" loading={busy} onClick={makePrimary}>
                        Set {fullName} as primary
                      </Btn>
                    )}
                  </div>
                )}
              </div>
              <ShieldDoodle size={130} accent="#FBFAF8" />
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
      {toastNode}
    </>
  );
}

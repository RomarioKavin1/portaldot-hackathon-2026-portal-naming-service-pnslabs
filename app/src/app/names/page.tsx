"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { YourNames } from "@/components/YourNames";
import { Btn } from "@/components/ui";
import { SketchDefs, WalletDoodle } from "@/components/doodles";
import { useSubstrateAccount } from "@/lib/use-account";

export default function NamesPage() {
  const router = useRouter();
  const { ready, authenticated, login } = useSubstrateAccount();

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
              <h1 className="display" style={{ fontSize: "clamp(40px,5vw,60px)", margin: 0 }}>My names</h1>
              <p className="lead" style={{ marginTop: 12, maxWidth: 520 }}>
                This browser remembers the names you minted from this wallet. The chain has no owner→names index, so the
                dApp keeps a local list.
              </p>
            </div>
            <Link href="/">
              <Btn variant="dark">Register another</Btn>
            </Link>
          </div>
        </div>

        <div className="wrap" style={{ marginTop: 18 }}>
          {!ready ? (
            <div className="panel" style={{ padding: 30, textAlign: "center" }}>
              <span className="body-txt">Loading wallet…</span>
            </div>
          ) : !authenticated ? (
            <div className="card card-blush" style={{ padding: "48px 40px", textAlign: "center" }}>
              <div style={{ display: "grid", placeItems: "center", marginBottom: 10 }}>
                <WalletDoodle size={110} />
              </div>
              <h3 className="display" style={{ fontSize: 30, margin: "0 0 10px" }}>No wallet connected</h3>
              <p className="lead" style={{ maxWidth: 380, margin: "0 auto 22px" }}>
                Your names are tied to your SS58 account — connect to load them.
              </p>
              <Btn variant="dark" size="btn-lg" onClick={login}>Connect wallet</Btn>
            </div>
          ) : (
            <YourNames variant="full" />
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

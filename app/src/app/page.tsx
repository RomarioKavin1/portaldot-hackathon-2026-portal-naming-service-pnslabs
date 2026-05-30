"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SearchConsole } from "@/components/SearchConsole";
import { YourNames } from "@/components/YourNames";
import { Btn, CodeBlock, Eyebrow } from "@/components/ui";
import {
  CoinDoodle,
  Dashes,
  KeyDoodle,
  NameTag,
  ScribbleUnderline,
  SignpostDoodle,
  SketchDefs,
  Sparkle,
  TreeDoodle,
} from "@/components/doodles";

/* Landing — original content ("Own your name on Portaldot.") styled in the
   pastel/doodle UI system. Mint/Lookup tabs + Your names + feature triad +
   SDK docs CTA. */

const FEATURES = [
  {
    color: "blush" as const,
    title: "One name, one identity",
    body: "Map a human handle to an account and records, resolved the same way by every dApp.",
    Doodle: SignpostDoodle,
  },
  {
    color: "mint" as const,
    title: "Forward-verified reverse",
    body: "Address → name only resolves when the name points back. Spoofed records are dropped.",
    Doodle: KeyDoodle,
  },
  {
    color: "peach" as const,
    title: "Length-tier pricing",
    body: "Shorter names cost more, in POT, with annual rent and a grace period before release.",
    Doodle: TreeDoodle,
  },
];

export default function Home() {
  return (
    <>
      <SketchDefs />
      <SiteHeader />

      <main style={{ minHeight: "60vh" }} className="view-in">
        <div className="wrap" style={{ paddingTop: 46, paddingBottom: 10, position: "relative" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.45fr) minmax(0, 1fr)",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div style={{ maxWidth: 720, position: "relative" }}>
              <div
                aria-hidden
                style={{ position: "absolute", left: -10, top: -22 }}
                className="floaty"
              >
                <Sparkle size={28} />
              </div>
              <Eyebrow>Portaldot · naming registry</Eyebrow>
              <h1 className="display" style={{ fontSize: "clamp(52px, 7vw, 94px)", margin: "16px 0 0" }}>
                Own your{" "}
                <span className="scribble-u">
                  name
                  <ScribbleUnderline />
                </span>
                <br />
                on Portaldot.
              </h1>
              <p className="lead" style={{ maxWidth: 540, marginTop: 22 }}>
                Mint a <span className="mono" style={{ color: "var(--ink)", fontWeight: 700 }}>.pot</span>{" "}
                name and point it at your account, your records, your identity — readable across every dApp on the chain.
              </p>
            </div>

            {/* hero doodle cluster */}
            <div
              style={{
                position: "relative",
                display: "grid",
                placeItems: "center",
                minHeight: 240,
              }}
            >
              <div className="floaty" style={{ transform: "rotate(-6deg)" }}>
                <NameTag size={210} />
              </div>
              <div
                aria-hidden
                className="floaty"
                style={{ position: "absolute", top: 6, right: -4, ['--rot' as never]: "10deg" }}
              >
                <CoinDoodle size={84} />
              </div>
            </div>
          </div>
        </div>

        <div className="wrap" style={{ marginTop: 26 }}>
          <SearchConsole />
        </div>

        <div className="wrap" style={{ marginTop: 56 }}>
          <YourNames variant="teaser" />
        </div>

        <div className="wrap" style={{ marginTop: 64 }}>
          <div className="row spread" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
            <h2 className="h2" style={{ fontSize: 34, margin: 0 }}>
              One protocol,<br />three guarantees.
            </h2>
            <span className="body-txt" style={{ maxWidth: 280, fontSize: 14 }}>
              Six ink! contracts on a non-EVM Substrate chain. Here&apos;s what they buy you.
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`card card-${f.color}`}
                style={{ padding: "26px 26px 30px", minHeight: 268, display: "flex", flexDirection: "column" }}
              >
                <Dashes widths={[24, 16, 20, 11]} />
                <div style={{ flex: 1, display: "grid", placeItems: "center", margin: "10px 0 6px" }}>
                  <f.Doodle size={110} />
                </div>
                <h3 className="h2" style={{ fontSize: 25, margin: "0 0 8px" }}>{f.title}</h3>
                <p className="body-txt" style={{ fontSize: 14, margin: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="wrap" style={{ marginTop: 56 }}>
          <div
            className="card card-paper"
            style={{
              padding: "34px 36px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 36,
              alignItems: "center",
            }}
          >
            <div>
              <Eyebrow>Building on Portaldot?</Eyebrow>
              <h2 className="h2" style={{ fontSize: 32, margin: "12px 0 10px" }}>
                Resolve <span className="mono">.pot</span> names from your own app.
              </h2>
              <p className="body-txt" style={{ maxWidth: 380 }}>
                TypeScript on npm and a matching Python client share one{" "}
                <span style={{ fontWeight: 700, color: "var(--ink)" }} className="mono">blake2_256</span> namehash
                spec. Zero-config{" "}
                <span className="mono" style={{ fontWeight: 700, color: "var(--ink)" }}>connect()</span>, network
                presets included.
              </p>
              <div className="row gap-12" style={{ marginTop: 20 }}>
                <Link href="/docs">
                  <Btn variant="dark">Read the SDK docs</Btn>
                </Link>
                <span className="chip">npm i portaldot-pns</span>
              </div>
            </div>
            <CodeBlock
              lang="typescript"
              lines={[
                'import { connect } from "portaldot-pns";',
                '',
                'const pns   = await connect();',
                'const acct  = await pns.resolve("alice.pot");',
                'const name  = await pns.reverse(acct);',
              ]}
            />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

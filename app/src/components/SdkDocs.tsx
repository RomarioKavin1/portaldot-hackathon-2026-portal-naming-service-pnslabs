"use client";

import { useState } from "react";
import { Btn, CodeBlock, Eyebrow, Seg } from "@/components/ui";
import { KeyDoodle, CoinStack, ScribbleUnderline } from "@/components/doodles";

type PM = "npm" | "pnpm" | "yarn";

const INSTALL: Record<PM, string> = {
  npm: "npm install portaldot-pns",
  pnpm: "pnpm add portaldot-pns",
  yarn: "yarn add portaldot-pns",
};

const QUICKSTART = [
  'import { connect } from "portaldot-pns";',
  '',
  'const pns = await connect();',
  '',
  '// forward: name → account',
  'const acct = await pns.resolve("alice.pot");',
  '',
  '// reverse: account → primary name',
  'const name = await pns.reverse(acct);',
  '',
  'await pns.disconnect();',
];

const CUSTOM = [
  'import { connect } from "portaldot-pns";',
  '',
  'const pns = await connect({',
  '  url: "wss://my-portaldot.node",',
  '  contracts: {',
  '    registry: "5C…",',
  '    potRegistrar: "5D…",',
  '    registrarController: "5E…",',
  '    publicResolver: "5F…",',
  '    reverseRegistrar: "5G…",',
  '  },',
  '});',
];

const API_ROWS = [
  { sig: "connect(opts?)", ret: "Promise<PnsClient>", note: "Zero-config or pass a custom RPC + contract set." },
  { sig: "resolve(name)", ret: "Promise<Account | null>", note: "Forward resolution — alice.pot → SS58." },
  { sig: "reverse(addr)", ret: "Promise<string | null>", note: "Reverse, forward-verified to defeat spoofing." },
  { sig: "namehash(name)", ret: "Uint8Array (32 bytes)", note: "blake2_256 namehash — identical in TS & Python." },
  { sig: "normalize(name)", ret: "string", note: "Canonicalize a label before hashing or display." },
  { sig: "disconnect()", ret: "Promise<void>", note: "Tear down the polkadot.js provider." },
];

export function SdkDocs() {
  const [pm, setPm] = useState<PM>("npm");

  return (
    <div className="view-in">
      <div className="wrap" style={{ paddingTop: 34, paddingBottom: 8 }}>
        <div className="row spread" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <Eyebrow>TypeScript & Python SDK</Eyebrow>
            <h1 className="display" style={{ fontSize: "clamp(40px,5vw,60px)", margin: "16px 0 0" }}>
              SDK <span className="scribble-u">docs<ScribbleUnderline /></span>
            </h1>
            <p className="lead" style={{ marginTop: 16, maxWidth: 520 }}>
              Resolve, register, and read records from TypeScript or Python — one canonical namehash spec, no indexer.
            </p>
          </div>
          <span className="chip" style={{ fontSize: 12 }}>portaldot-pns · npm</span>
        </div>
      </div>

      <div className="wrap" style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr", gap: 22 }}>
        <div className="card card-paper" style={{ padding: "26px 28px", border: "1.5px solid var(--line)" }}>
          <div className="row spread" style={{ marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
            <div>
              <Eyebrow>1 · Install</Eyebrow>
              <h3 className="h2" style={{ fontSize: 24, margin: "8px 0 14px" }}>Install the SDK</h3>
            </div>
            <Seg
              options={[
                { id: "npm", label: "npm" },
                { id: "pnpm", label: "pnpm" },
                { id: "yarn", label: "yarn" },
              ]}
              value={pm}
              onChange={setPm}
            />
          </div>
          <CodeBlock lang="bash" lines={[INSTALL[pm]]} />
          <p className="body-txt" style={{ fontSize: 13.5, marginTop: 12 }}>
            Requires Node ≥ 18. The Python client (<span className="mono" style={{ color: "var(--ink)", fontWeight: 700 }}>portal_name</span>) exposes the same primitives — <span className="mono">pip install portal_name</span>.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          <div className="card card-blush" style={{ padding: "26px 28px" }}>
            <Eyebrow>2 · Quickstart</Eyebrow>
            <h3 className="h2" style={{ fontSize: 24, margin: "8px 0 16px" }}>Resolve both ways</h3>
            <CodeBlock lang="typescript" lines={QUICKSTART} />
          </div>
          <div className="card card-mint" style={{ padding: "26px 28px" }}>
            <Eyebrow>3 · Target any node</Eyebrow>
            <h3 className="h2" style={{ fontSize: 24, margin: "8px 0 16px" }}>Custom RPC & contracts</h3>
            <CodeBlock lang="typescript" lines={CUSTOM} />
          </div>
        </div>

        <div className="card card-paper" style={{ padding: "26px 28px", border: "1.5px solid var(--line)" }}>
          <div className="row spread" style={{ alignItems: "center", marginBottom: 16 }}>
            <div>
              <Eyebrow>4 · Reference</Eyebrow>
              <h3 className="h2" style={{ fontSize: 24, margin: "8px 0 0" }}>Client API</h3>
            </div>
            <KeyDoodle size={56} />
          </div>
          <div style={{ borderTop: "1.5px solid var(--line-soft)" }}>
            {API_ROWS.map((r) => (
              <div
                key={r.sig}
                className="row"
                style={{
                  gap: 18,
                  padding: "14px 4px",
                  borderBottom: "1.5px solid var(--line-soft)",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                }}
              >
                <span className="mono" style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", minWidth: 190 }}>{r.sig}</span>
                <span className="mono" style={{ fontSize: 12.5, color: "var(--ink-soft)", minWidth: 170 }}>{r.ret}</span>
                <span className="body-txt" style={{ fontSize: 13.5, flex: 1, minWidth: 200 }}>{r.note}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-peach" style={{ padding: "26px 28px" }}>
          <div className="row spread" style={{ alignItems: "flex-end", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <div>
              <Eyebrow>Length-tier pricing</Eyebrow>
              <h3 className="h2" style={{ fontSize: 24, margin: "8px 0 0" }}>Annual cost in POT</h3>
            </div>
            <CoinStack size={56} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            {[
              { t: "5+ chars", p: 5, tag: "standard" },
              { t: "4 chars", p: 40 },
              { t: "3 chars", p: 160 },
              { t: "1–2 chars", p: 640, tag: "premium" },
            ].map((x) => (
              <div
                key={x.t}
                style={{
                  background: "var(--paper)",
                  borderRadius: 16,
                  padding: "18px 16px",
                  border: "1.5px solid var(--line-soft)",
                }}
              >
                <div className="body-txt" style={{ fontSize: 13 }}>{x.t}</div>
                <div className="display" style={{ fontSize: 30, margin: "4px 0 2px" }}>{x.p}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>POT / year</div>
                {x.tag && (
                  <span className="tag tag-ink" style={{ fontSize: 9.5, marginTop: 8 }}>
                    {x.tag}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="row gap-12" style={{ marginTop: 8 }}>
          <a href="https://www.npmjs.com/package/portaldot-pns" target="_blank" rel="noreferrer">
            <Btn variant="dark">Open on npm</Btn>
          </a>
          <a href="https://github.com/RomarioKavin1/PortalNamingService" target="_blank" rel="noreferrer">
            <Btn variant="ghost">Source on GitHub</Btn>
          </a>
        </div>
      </div>
    </div>
  );
}

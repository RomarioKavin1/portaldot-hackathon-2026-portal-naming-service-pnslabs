"use client";

import { useState } from "react";
import { CodeBlock, CommandLine } from "@/components/ui";

const PKG = "portaldot-pns";

const INSTALL: Record<string, string> = {
  npm: `npm install ${PKG}`,
  pnpm: `pnpm add ${PKG}`,
  yarn: `yarn add ${PKG}`,
};

const QUICKSTART = `import { connect } from "${PKG}";

// testnet, zero config (deployment is bundled)
const pns = await connect();

const addr = await pns.resolve("alice.pot");   // → "5Grw…" | null
const name = await pns.reverse(addr);            // → "alice.pot" (forward-verified)

await pns.disconnect();`;

const CUSTOM_RPC = `import { connect } from "${PKG}";

// your own node or mainnet — same runtime, just point url at it
const pns = await connect({
  url: "wss://mainnet.portaldot.io",
  contracts: {
    registry:            "5…",
    potRegistrar:        "5…",
    registrarController: "5…",
    publicResolver:      "5…",
    reverseRegistrar:    "5…",  // optional, enables reverse()
  },
});`;

const API: Array<[string, string]> = [
  ["connect(cfg?)", "Open a client. No args → bundled testnet deployment."],
  ["client.resolve(name)", "name.pot → SS58 address, or null. Normalizes first."],
  ["client.reverse(addr)", "address → primary name, only if it forward-verifies."],
  ["client.disconnect()", "Close the WebSocket connection."],
  ["namehash(name)", "ENS-style blake2_256 namehash of a full name."],
  ["normalize(name)", "Canonicalize a name; throws on invalid input."],
  ["NETWORKS", "Built-in network presets (testnet, mainnet)."],
];

export function SdkDocs() {
  const [mgr, setMgr] = useState<keyof typeof INSTALL>("npm");

  return (
    <div className="space-y-12">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent-ink">
          TypeScript SDK
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Integrate <span className="font-mono">.pot</span> names
        </h1>
        <p className="mt-3 max-w-prose text-[0.95rem] leading-relaxed text-ink-soft">
          Resolve and reverse-resolve names from any app. Works against the
          testnet out of the box, or any node you point it at.
        </p>
        <a
          href={`https://www.npmjs.com/package/${PKG}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink-soft transition-colors duration-150 hover:border-line-strong hover:text-ink"
        >
          {PKG}
          <ExternalIcon />
        </a>
      </header>

      <Section n={1} title="Install">
        <div className="mb-2.5 inline-flex rounded-lg border border-line bg-surface p-0.5">
          {(Object.keys(INSTALL) as Array<keyof typeof INSTALL>).map((m) => (
            <button
              key={m}
              onClick={() => setMgr(m)}
              className={
                "rounded-md px-3 py-1.5 font-mono text-xs transition-colors duration-150 " +
                (mgr === m ? "bg-elevated text-ink shadow-panel" : "text-ink-faint hover:text-ink")
              }
            >
              {m}
            </button>
          ))}
        </div>
        <CommandLine command={INSTALL[mgr]} />
      </Section>

      <Section n={2} title="Resolve & reverse">
        <CodeBlock code={QUICKSTART} lang="ts" />
      </Section>

      <Section n={3} title="Your own node or mainnet">
        <CodeBlock code={CUSTOM_RPC} lang="ts" />
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Mainnet runs the identical runtime as testnet, so the same code path
          works. Pass <span className="font-mono">contracts</span> for any
          network without a bundled deployment.
        </p>
      </Section>

      <Section n={4} title="API reference">
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <tbody>
              {API.map(([sig, desc], i) => (
                <tr
                  key={sig}
                  className={i % 2 ? "bg-surface/40" : "bg-surface-2/40"}
                >
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 align-top font-mono text-[0.82rem] text-accent-ink">
                    {sig}
                  </td>
                  <td className="border-b border-line px-4 py-3 text-ink-soft">
                    {desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Names are normalized before hashing; reverse resolution is always
          forward-verified.
        </p>
      </Section>
    </div>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-[auto_1fr] gap-x-4">
      <div className="flex flex-col items-center">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface font-mono text-xs text-accent-ink">
          {n}
        </span>
        <span className="mt-1 w-px flex-1 bg-line" />
      </div>
      <div className="min-w-0 pb-2">
        <h2 className="mb-3 text-base font-medium text-ink">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function ExternalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 5h5v5M19 5l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 14v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

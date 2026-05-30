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

// devnet, zero config (deployment is bundled)
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

export function SdkDocs() {
  const [mgr, setMgr] = useState<keyof typeof INSTALL>("npm");

  return (
    <section id="sdk" className="scroll-mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-mono text-2xl text-ink">Integrate</h2>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-soft">
            Resolve <span className="font-mono">.pot</span> names from your own
            app with the TypeScript SDK. Works against the devnet out of the box,
            or any node you point it at.
          </p>
        </div>
        <a
          href={`https://www.npmjs.com/package/${PKG}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 font-mono text-sm text-ink-soft transition-colors duration-150 hover:border-line-strong hover:text-ink"
        >
          {PKG}
          <ExternalIcon />
        </a>
      </div>

      <div className="mt-6 space-y-8">
        <Step n={1} title="Install">
          <div className="mb-2.5 inline-flex rounded-lg border border-line bg-inset p-0.5">
            {(Object.keys(INSTALL) as Array<keyof typeof INSTALL>).map((m) => (
              <button
                key={m}
                onClick={() => setMgr(m)}
                className={
                  "rounded-md px-3 py-1.5 font-mono text-xs transition-colors duration-150 " +
                  (mgr === m
                    ? "bg-panel text-ink shadow-sm"
                    : "text-ink-faint hover:text-ink")
                }
              >
                {m}
              </button>
            ))}
          </div>
          <CommandLine command={INSTALL[mgr]} />
        </Step>

        <Step n={2} title="Resolve & reverse">
          <CodeBlock code={QUICKSTART} lang="ts" />
        </Step>

        <Step n={3} title="Your own node or mainnet">
          <CodeBlock code={CUSTOM_RPC} lang="ts" />
          <p className="mt-2.5 text-xs leading-relaxed text-ink-faint">
            Mainnet runs the identical runtime as devnet, so the same code path
            works. Pass <span className="font-mono">contracts</span> for any
            network without a bundled deployment.
          </p>
        </Step>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5">
      <div className="flex flex-col items-center">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-panel font-mono text-xs text-accent-ink">
          {n}
        </span>
        <span className="mt-1 w-px flex-1 bg-line" />
      </div>
      <div className="min-w-0 pb-1">
        <h3 className="mb-2.5 text-sm font-medium text-ink">{title}</h3>
        {children}
      </div>
    </div>
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

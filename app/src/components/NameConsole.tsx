"use client";

import { useMemo, useState } from "react";
import { tryNormalize } from "portaldot-pns";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { getClient } from "@/lib/pns";
import { listAccounts } from "@/lib/wallet";
import { registerName } from "@/lib/register";
import { shortAddr, quote60d } from "@/lib/format";
import { Button, Field, inputClass, CopyButton } from "@/components/ui";

const ADDRS = {
  registry: process.env.NEXT_PUBLIC_PNS_REGISTRY ?? "",
  controller: process.env.NEXT_PUBLIC_PNS_REGISTRAR_CONTROLLER ?? "",
  resolver: process.env.NEXT_PUBLIC_PNS_PUBLIC_RESOLVER ?? "",
};

type Result =
  | { kind: "searching"; name: string }
  | { kind: "taken"; name: string; address: string }
  | { kind: "free"; name: string }
  | { kind: "error"; message: string };

export function NameConsole() {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const normalized = tryNormalize(raw);
  const valid =
    normalized !== null && normalized.length >= 1 && normalized.length <= 32;

  const search = async () => {
    if (!valid || !normalized) return;
    setResult({ kind: "searching", name: normalized });
    try {
      const client = await getClient();
      const addr = await client.resolve(normalized);
      setResult(
        addr
          ? { kind: "taken", name: normalized, address: addr }
          : { kind: "free", name: normalized },
      );
    } catch (e: unknown) {
      setResult({ kind: "error", message: msg(e) });
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="flex flex-1 items-stretch overflow-hidden rounded-xl border border-line bg-panel shadow-sm transition-colors duration-150 focus-within:border-accent">
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="search a name"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent px-4 py-4 font-mono text-base text-ink outline-none placeholder:text-ink-faint/70"
          />
          <span className="flex select-none items-center pr-4 font-mono text-base text-accent-ink">
            .pot
          </span>
        </div>
        <Button
          onClick={search}
          disabled={!valid}
          loading={result?.kind === "searching"}
          className="py-4 sm:px-7"
        >
          Search
        </Button>
      </div>

      {raw.length > 0 && !valid && (
        <p className="mt-2.5 text-xs text-danger">
          That name will not normalize. Check for spaces, uppercase, leading or
          trailing dots, or unsupported characters.
        </p>
      )}

      {result && (
        <div className="mt-5 pns-rise">
          <ResultView result={result} onClaimed={search} />
        </div>
      )}
    </div>
  );
}

function ResultView({
  result,
  onClaimed,
}: {
  result: Result;
  onClaimed: () => void;
}) {
  if (result.kind === "searching") {
    return (
      <div className="h-[5.5rem] animate-pulse rounded-xl border border-line bg-inset" />
    );
  }

  if (result.kind === "error") {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3.5 text-sm text-danger">
        {result.message}
      </div>
    );
  }

  if (result.kind === "taken") {
    return (
      <div className="rounded-xl border border-line bg-panel p-5 shadow-panel">
        <div className="flex items-center gap-2">
          <Dot tone="accent" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-accent-ink">
            Registered
          </span>
        </div>
        <p className="mt-3 font-mono text-xl text-ink">
          {result.name}
          <span className="text-accent-ink">.pot</span>
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line bg-inset px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-[0.7rem] uppercase tracking-[0.14em] text-ink-faint">
              Resolves to
            </p>
            <p className="mt-0.5 truncate font-mono text-sm text-ink" title={result.address}>
              {shortAddr(result.address, 10, 10)}
            </p>
          </div>
          <CopyButton value={result.address} label="Copy address" />
        </div>
      </div>
    );
  }

  // free
  return <ClaimPanel name={result.name} onClaimed={onClaimed} />;
}

/* ── Claim flow (wallet detection + commit-reveal register) ──────────── */

type Claim =
  | { kind: "intro" }
  | { kind: "no-wallet" }
  | { kind: "no-accounts" }
  | { kind: "ready" }
  | { kind: "registering"; step: string }
  | { kind: "error"; message: string };

function ClaimPanel({ name, onClaimed }: { name: string; onClaimed: () => void }) {
  const [claim, setClaim] = useState<Claim>({ kind: "intro" });
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [signer, setSigner] = useState("");

  const price = useMemo(() => quote60d(name.length), [name]);

  const connect = async () => {
    setClaim({ kind: "registering", step: "Connecting wallet…" });
    try {
      const accs = await listAccounts();
      if (accs.length === 0) {
        setClaim({ kind: "no-accounts" });
        return;
      }
      setAccounts(accs);
      setSigner(accs[0]!.address);
      setClaim({ kind: "ready" });
    } catch {
      setClaim({ kind: "no-wallet" });
    }
  };

  const doRegister = async () => {
    if (!signer) return;
    setClaim({ kind: "registering", step: "Preparing…" });
    try {
      const client = await getClient();
      await registerName({
        api: client.connection.api,
        fromAddress: signer,
        controller: ADDRS.controller,
        registry: ADDRS.registry,
        resolver: ADDRS.resolver,
        rawName: name,
        onStep: (step) => setClaim({ kind: "registering", step }),
      });
      onClaimed(); // re-run search → flips to the "registered" view
    } catch (e: unknown) {
      setClaim({ kind: "error", message: msg(e) });
    }
  };

  return (
    <div className="rounded-xl border border-accent/30 bg-panel p-5 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Dot tone="accent" />
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-accent-ink">
              Available
            </span>
          </div>
          <p className="mt-3 font-mono text-xl text-ink">
            {name}
            <span className="text-accent-ink">.pot</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg text-ink">{price}</p>
          <p className="text-[0.7rem] uppercase tracking-[0.14em] text-ink-faint">
            POT · 60 days
          </p>
        </div>
      </div>

      <p className="mt-1.5 text-xs text-ink-faint">
        No resolving record found. Pricing follows the length tiers in spec §5.
      </p>

      <div className="mt-4 border-t border-line pt-4">
        {claim.kind === "intro" && (
          <Button onClick={connect} className="w-full sm:w-auto">
            Claim this name
          </Button>
        )}

        {claim.kind === "no-wallet" && <NoWallet />}
        {claim.kind === "no-accounts" && <NoAccounts />}

        {claim.kind === "ready" && (
          <div className="space-y-3">
            <Field label="Sign with">
              <div className="relative">
                <select
                  value={signer}
                  onChange={(e) => setSigner(e.target.value)}
                  className={`${inputClass} appearance-none pr-9`}
                >
                  {accounts.map((a) => (
                    <option key={a.address} value={a.address}>
                      {a.meta.name ?? "account"} — {shortAddr(a.address, 8, 6)}
                    </option>
                  ))}
                </select>
                <Chevron />
              </div>
            </Field>
            <Button onClick={doRegister} className="w-full sm:w-auto">
              Register {name}.pot
            </Button>
          </div>
        )}

        {claim.kind === "registering" && (
          <div className="flex items-center gap-2.5 text-sm text-ink-soft">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
            {claim.step}
          </div>
        )}

        {claim.kind === "error" && (
          <div className="space-y-3">
            <p className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {claim.message}
            </p>
            <Button variant="ghost" onClick={() => setClaim({ kind: "ready" })}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function NoWallet() {
  return (
    <p className="text-sm leading-relaxed text-ink-soft">
      No Polkadot.js extension detected. Install the{" "}
      <a
        href="https://polkadot.js.org/extension/"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-accent-ink underline underline-offset-2 hover:text-accent-strong"
      >
        browser extension
      </a>{" "}
      to sign registrations, then reload.
    </p>
  );
}

function NoAccounts() {
  return (
    <div className="text-sm leading-relaxed text-ink-soft">
      <p className="text-ink">
        The extension is connected but has no accounts. Fastest path on the dev
        node:
      </p>
      <ol className="mt-3 space-y-2 [counter-reset:step]">
        {[
          <>
            Download{" "}
            <a href="/alice.json" download className="font-medium text-accent-ink underline underline-offset-2 hover:text-accent-strong">
              alice.json
            </a>{" "}
            — the pre-funded <Mono>//Alice</Mono> dev account.
          </>,
          <>
            In the Polkadot.js popup, click <Mono>+</Mono> →{" "}
            <span className="text-ink">Restore account from backup JSON file</span>.
          </>,
          <>
            Pick <Mono>alice.json</Mono>; the password is <Mono>password</Mono>.
          </>,
          <>Reload this page; Alice appears in the signer list, funded.</>,
        ].map((li, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-[0.7rem] text-accent-ink">
              {i + 1}
            </span>
            <span>{li}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ── tiny atoms ──────────────────────────────────────────────────────── */

function Dot({ tone }: { tone: "accent" }) {
  return (
    <span
      className="relative flex h-2 w-2"
      style={{ animation: "pns-pulse 2.4s ease-in-out infinite" }}
    >
      <span className={`h-2 w-2 rounded-full ${tone === "accent" ? "bg-accent" : ""}`} />
    </span>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-inset px-1.5 py-0.5 font-mono text-[0.8em] text-ink">
      {children}
    </code>
  );
}

function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
      width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function msg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

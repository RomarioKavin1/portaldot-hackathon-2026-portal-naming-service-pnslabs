"use client";

import { useMemo, useState } from "react";
import { tryNormalize } from "portaldot-pns";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useNetwork } from "@/lib/network-context";
import { listAccounts } from "@/lib/wallet";
import { registerName } from "@/lib/register";
import { shortAddr, quote60d } from "@/lib/format";
import { Button, Field, inputClass, CopyButton } from "@/components/ui";

type Result =
  | { kind: "searching"; name: string }
  | { kind: "taken"; name: string; address: string }
  | { kind: "free"; name: string }
  | { kind: "error"; message: string };

export function NameConsole() {
  const { net, getClient } = useNetwork();
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const normalized = tryNormalize(raw);
  const valid =
    normalized !== null && normalized.length >= 1 && normalized.length <= 32;

  const search = async () => {
    if (!valid || !normalized || !net.ready) return;
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

  if (!net.ready) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 text-sm text-ink-soft shadow-panel">
        <span className="font-medium text-ink">{net.label} is not live yet.</span>{" "}
        Contract addresses for this network have not been configured. Switch to a
        live network from the selector above.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="group flex flex-1 items-stretch overflow-hidden rounded-2xl border border-line bg-surface shadow-panel transition-[border-color,box-shadow] duration-200 focus-within:border-accent/60 focus-within:shadow-glow-lg">
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="search a name"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent px-5 py-5 font-mono text-lg text-ink outline-none placeholder:text-ink-faint/60"
          />
          <span className="flex select-none items-center pr-5 font-mono text-lg text-accent-ink">
            .pot
          </span>
        </div>
        <Button
          onClick={search}
          disabled={!valid}
          loading={result?.kind === "searching"}
          className="py-5 text-base sm:px-8"
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
          <ResultView result={result} onMinted={search} />
        </div>
      )}
    </div>
  );
}

function ResultView({
  result,
  onMinted,
}: {
  result: Result;
  onMinted: () => void;
}) {
  if (result.kind === "searching") {
    return (
      <div className="h-[6.5rem] animate-pulse rounded-2xl border border-line bg-surface" />
    );
  }

  if (result.kind === "error") {
    return (
      <div className="rounded-2xl border border-danger/40 bg-danger-soft/40 px-5 py-4 text-sm text-danger">
        {result.message}
      </div>
    );
  }

  if (result.kind === "taken") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
        <Eyebrow tone="neutral">Registered</Eyebrow>
        <p className="mt-3 font-mono text-2xl text-ink">
          {result.name}
          <span className="text-accent-ink">.pot</span>
        </p>
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[0.7rem] uppercase tracking-[0.16em] text-ink-faint">
              Resolves to
            </p>
            <p className="mt-1 truncate font-mono text-sm text-ink" title={result.address}>
              {shortAddr(result.address, 12, 10)}
            </p>
          </div>
          <CopyButton value={result.address} label="Copy" />
        </div>
      </div>
    );
  }

  return <MintPanel name={result.name} onMinted={onMinted} />;
}

/* ── Mint flow ───────────────────────────────────────────────────────── */

type Mint =
  | { kind: "intro" }
  | { kind: "no-wallet" }
  | { kind: "no-accounts" }
  | { kind: "ready" }
  | { kind: "minting"; step: string }
  | { kind: "error"; message: string };

function MintPanel({ name, onMinted }: { name: string; onMinted: () => void }) {
  const { net, getClient } = useNetwork();
  const [mint, setMint] = useState<Mint>({ kind: "intro" });
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [signer, setSigner] = useState("");

  const price = useMemo(() => quote60d(name.length), [name]);

  const connect = async () => {
    setMint({ kind: "minting", step: "Connecting wallet…" });
    try {
      const accs = await listAccounts();
      if (accs.length === 0) {
        setMint({ kind: "no-accounts" });
        return;
      }
      setAccounts(accs);
      setSigner(accs[0]!.address);
      setMint({ kind: "ready" });
    } catch {
      setMint({ kind: "no-wallet" });
    }
  };

  const doMint = async () => {
    if (!signer) return;
    setMint({ kind: "minting", step: "Preparing…" });
    try {
      const client = await getClient();
      await registerName({
        api: client.connection.api,
        fromAddress: signer,
        controller: net.contracts.registrarController,
        registry: net.contracts.registry,
        resolver: net.contracts.publicResolver,
        rawName: name,
        onStep: (step) => setMint({ kind: "minting", step }),
      });
      onMinted();
    } catch (e: unknown) {
      setMint({ kind: "error", message: msg(e) });
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-accent/40 bg-surface shadow-glow">
      <div className="flex flex-wrap items-start justify-between gap-4 p-6">
        <div>
          <Eyebrow tone="ok">Available</Eyebrow>
          <p className="mt-3 font-mono text-2xl text-ink">
            {name}
            <span className="text-accent-ink">.pot</span>
          </p>
          <p className="mt-2 text-xs text-ink-faint">
            No resolving record. Length-tier pricing per spec §5.
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xl text-ink">{price}</p>
          <p className="text-[0.7rem] uppercase tracking-[0.16em] text-ink-faint">
            POT · 60 days
          </p>
        </div>
      </div>

      <div className="border-t border-line bg-surface-2/50 p-6">
        {mint.kind === "intro" && (
          <Button onClick={connect} className="w-full sm:w-auto">
            Mint {name}.pot
          </Button>
        )}

        {mint.kind === "no-wallet" && <NoWallet />}
        {mint.kind === "no-accounts" && <NoAccounts />}

        {mint.kind === "ready" && (
          <div className="space-y-3.5">
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
            <Button onClick={doMint} className="w-full sm:w-auto">
              Mint {name}.pot
            </Button>
          </div>
        )}

        {mint.kind === "minting" && (
          <div className="flex items-center gap-2.5 text-sm text-ink-soft">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
            {mint.step}
          </div>
        )}

        {mint.kind === "error" && (
          <div className="space-y-3">
            <p className="rounded-xl border border-danger/40 bg-danger-soft/40 px-4 py-3 text-sm text-danger">
              {mint.message}
            </p>
            <Button variant="ghost" onClick={() => setMint({ kind: "ready" })}>
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
        className="font-medium text-accent-ink underline underline-offset-2 hover:text-accent"
      >
        browser extension
      </a>{" "}
      to sign, then reload.
    </p>
  );
}

function NoAccounts() {
  const items: React.ReactNode[] = [
    <>
      Download{" "}
      <a href="/alice.json" download className="font-medium text-accent-ink underline underline-offset-2 hover:text-accent">
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
    <>Reload; Alice appears in the signer list, funded.</>,
  ];
  return (
    <div className="text-sm leading-relaxed text-ink-soft">
      <p className="text-ink">
        The extension is connected but has no accounts. Fastest path on testnet:
      </p>
      <ol className="mt-3 space-y-2">
        {items.map((li, i) => (
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

/* ── atoms ───────────────────────────────────────────────────────────── */

function Eyebrow({
  tone,
  children,
}: {
  tone: "ok" | "neutral";
  children: React.ReactNode;
}) {
  const color = tone === "ok" ? "text-ok" : "text-accent-ink";
  const dot = tone === "ok" ? "bg-ok" : "bg-accent";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`h-2 w-2 rounded-full ${dot}`}
        style={{ animation: "pns-pulse 2.4s ease-in-out infinite" }}
      />
      <span className={`text-xs font-medium uppercase tracking-[0.16em] ${color}`}>
        {children}
      </span>
    </span>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.8em] text-ink">
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
  return e instanceof Error ? e.message : String(e);
}

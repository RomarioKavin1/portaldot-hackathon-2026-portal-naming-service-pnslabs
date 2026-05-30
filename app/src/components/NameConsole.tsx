"use client";

import { useMemo, useState } from "react";
import { tryNormalize } from "portaldot-pns";
import { useNetwork } from "@/lib/network-context";
import { useSubstrateAccount } from "@/lib/use-account";
import { createPrivySigner } from "@/lib/privy-signer";
import { registerName } from "@/lib/register";
import { requestFaucet } from "@/lib/faucet";
import { addOwnedName } from "@/lib/owned-names";
import { shortAddr, quote60d } from "@/lib/format";
import { Button, CopyButton } from "@/components/ui";

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
      // The input is a bare label ("romario"); names live under .pot.
      const addr = await client.resolve(`${normalized}.pot`);
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
          <ResultView
            result={result}
            onMinted={(address) => {
              // We just registered it to the signed-in account; show that
              // directly rather than re-querying (the new block isn't
              // immediately readable, which would briefly read as "free").
              if (result && "name" in result) {
                setResult({ kind: "taken", name: result.name, address });
              }
            }}
          />
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
  onMinted: (address: string) => void;
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

/* ── Mint flow (Privy login → faucet → on-chain register) ────────────── */

type Phase =
  | { kind: "idle" }
  | { kind: "funding" }
  | { kind: "funded"; amount: string }
  | { kind: "minting"; step: string }
  | { kind: "error"; message: string };

function MintPanel({
  name,
  onMinted,
}: {
  name: string;
  onMinted: (address: string) => void;
}) {
  const { net, getClient } = useNetwork();
  const { ready, authenticated, login, address, wallet, signMessage } =
    useSubstrateAccount();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const price = useMemo(() => quote60d(name.length), [name]);
  const busy = phase.kind === "funding" || phase.kind === "minting";

  const fund = async () => {
    if (!address) return;
    setPhase({ kind: "funding" });
    const r = await requestFaucet(address);
    setPhase(
      r.error
        ? { kind: "error", message: r.error }
        : { kind: "funded", amount: r.amount ?? "200" },
    );
  };

  const mint = async () => {
    if (!address || !wallet) return;
    setPhase({ kind: "minting", step: "Preparing…" });
    try {
      const client = await getClient();
      const api = client.connection.api;
      const signer = createPrivySigner(api, wallet, signMessage);
      await registerName({
        api,
        signer,
        fromAddress: address,
        controller: net.contracts.registrarController,
        registry: net.contracts.registry,
        resolver: net.contracts.publicResolver,
        rawName: name,
        onStep: (step) => setPhase({ kind: "minting", step }),
      });
      addOwnedName(address, `${name}.pot`);
      onMinted(address);
    } catch (e: unknown) {
      setPhase({ kind: "error", message: msg(e) });
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
        {!ready ? (
          <div className="flex items-center gap-2.5 text-sm text-ink-faint">
            <Spinner /> Loading account…
          </div>
        ) : !authenticated ? (
          <div>
            <Button onClick={login} className="w-full sm:w-auto">
              Sign in to mint
            </Button>
            <p className="mt-2.5 text-xs text-ink-faint">
              Sign in with email or Google. A wallet is created for you, no
              extension required.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-[0.7rem] uppercase tracking-[0.16em] text-ink-faint">
                  Your account
                </p>
                <p className="mt-0.5 truncate font-mono text-sm text-ink" title={address ?? ""}>
                  {address ? shortAddr(address, 12, 10) : "creating wallet…"}
                </p>
              </div>
              {address && <CopyButton value={address} label="Copy" />}
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Button onClick={mint} loading={phase.kind === "minting"} disabled={busy || !address}>
                Mint {name}.pot
              </Button>
              <Button
                variant="ghost"
                onClick={fund}
                loading={phase.kind === "funding"}
                disabled={busy || !address}
              >
                Get test POT
              </Button>
            </div>

            {phase.kind === "minting" && (
              <p className="text-sm text-ink-soft">{phase.step}</p>
            )}
            {phase.kind === "funded" && (
              <p className="text-sm text-ok">
                Funded {phase.amount} POT. You can mint now.
              </p>
            )}
            {phase.kind === "error" && (
              <p className="rounded-xl border border-danger/40 bg-danger-soft/40 px-4 py-3 text-sm text-danger">
                {phase.message}
              </p>
            )}
            <p className="text-xs text-ink-faint">
              Need funds first? Tap <span className="text-ink">Get test POT</span>,
              then mint. Minting signs four messages with your embedded wallet.
            </p>
          </div>
        )}
      </div>
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

function Spinner() {
  return (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
  );
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

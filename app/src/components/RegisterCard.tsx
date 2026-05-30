"use client";

import { useEffect, useState } from "react";
import { tryNormalize } from "@portal-name/sdk";
import { getClient } from "@/lib/pns";
import { listAccounts } from "@/lib/wallet";
import { registerName } from "@/lib/register";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

type State =
  | { kind: "idle" }
  | { kind: "no-wallet" }
  | { kind: "no-accounts" }
  | { kind: "registering"; step: string }
  | { kind: "ok"; name: string; address: string }
  | { kind: "error"; message: string };

const ADDRS = {
  registry: process.env.NEXT_PUBLIC_PNS_REGISTRY!,
  controller: process.env.NEXT_PUBLIC_PNS_REGISTRAR_CONTROLLER!,
  resolver: process.env.NEXT_PUBLIC_PNS_PUBLIC_RESOLVER!,
};

export function RegisterCard() {
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [name, setName] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  // On mount, try to enable the extension and list accounts.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const accs = await listAccounts();
        if (!alive) return;
        if (accs.length === 0) {
          setState({ kind: "no-accounts" });
          return;
        }
        setAccounts(accs);
        setSelected(accs[0]!.address);
      } catch {
        if (alive) setState({ kind: "no-wallet" });
      }
    })();
    return () => { alive = false; };
  }, []);

  const normalized = tryNormalize(name);
  const lengthOK = normalized !== null && normalized.length >= 1 && normalized.length <= 32;

  const onRegister = async () => {
    if (!selected || !normalized) return;
    setState({ kind: "registering", step: "Preparing…" });
    try {
      const client = await getClient();
      await registerName({
        api: client.connection.api,
        fromAddress: selected,
        controller: ADDRS.controller,
        registry: ADDRS.registry,
        resolver: ADDRS.resolver,
        rawName: normalized,
        onStep: (step) => setState({ kind: "registering", step }),
      });
      setState({ kind: "ok", name: `${normalized}.pot`, address: selected });
    } catch (e: any) {
      setState({ kind: "error", message: e?.message ?? String(e) });
    }
  };

  if (state.kind === "no-wallet") {
    return (
      <NoticeBox
        title="No Polkadot.js extension"
        body={
          <>
            Install the{" "}
            <a
              href="https://polkadot.js.org/extension/"
              target="_blank"
              rel="noreferrer"
              className="text-pot-accent underline"
            >
              Polkadot.js browser extension
            </a>{" "}
            to sign registrations. Reload after installing.
          </>
        }
      />
    );
  }

  if (state.kind === "no-accounts") {
    return (
      <NoticeBox
        title="No accounts in the extension"
        body="Add an account to the Polkadot.js extension (it just needs to hold POT for rent + the registration fee, e.g. //Alice). Reload after creating one."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
          Signer
        </label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 font-mono text-sm text-zinc-100 outline-none ring-pot-primary/40 focus:ring-2"
        >
          {accounts.map((a) => (
            <option key={a.address} value={a.address}>
              {a.meta.name ?? "?"} — {a.address.slice(0, 8)}…{a.address.slice(-6)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
          Name
        </label>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex flex-1 items-stretch rounded-lg border border-zinc-800 bg-zinc-950/60 ring-pot-primary/40 focus-within:ring-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && lengthOK && state.kind !== "registering") onRegister();
              }}
              placeholder="yourname"
              className="flex-1 bg-transparent px-4 py-3 font-mono text-sm text-zinc-100 outline-none"
            />
            <span className="px-3 py-3 font-mono text-sm text-zinc-500">.pot</span>
          </div>
          <button
            onClick={onRegister}
            disabled={!lengthOK || state.kind === "registering"}
            className="rounded-lg bg-pot-primary px-5 py-3 text-sm font-medium text-white shadow transition hover:brightness-110 disabled:opacity-50"
          >
            {state.kind === "registering" ? "…" : "Register"}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Costs <span className="font-mono text-zinc-300">
            {normalized ? quote(normalized.length) : "—"}
          </span>{" "}
          POT for 60 days. Pricing follows the length tiers from spec §5.
        </p>
      </div>

      {state.kind === "registering" && (
        <Status muted text={state.step} />
      )}
      {state.kind === "ok" && (
        <Status
          text={
            <>
              <span className="font-mono text-zinc-100">{state.name}</span>{" "}
              is yours — owner{" "}
              <span className="font-mono text-zinc-300">{state.address.slice(0, 10)}…{state.address.slice(-8)}</span>.
              Try resolving it in the Resolve tab.
            </>
          }
        />
      )}
      {state.kind === "error" && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      )}
    </div>
  );
}

function quote(nameLen: number) {
  const yearly = nameLen >= 5 ? 5 : nameLen === 4 ? 40 : nameLen === 3 ? 160 : 640;
  return ((yearly * 60) / 365).toFixed(2);
}

function NoticeBox({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">{body}</p>
    </div>
  );
}

function Status({ text, muted }: { text: React.ReactNode; muted?: boolean }) {
  return (
    <div
      className={
        "rounded-lg border px-4 py-3 text-sm " +
        (muted
          ? "border-zinc-800 bg-zinc-950/40 text-zinc-400"
          : "border-pot-accent/30 bg-pot-accent/5 text-zinc-100")
      }
    >
      {text}
    </div>
  );
}

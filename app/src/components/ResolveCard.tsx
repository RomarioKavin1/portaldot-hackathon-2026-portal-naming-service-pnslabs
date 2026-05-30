"use client";

import { useState } from "react";
import { tryNormalize } from "@portal-name/sdk";
import { getClient } from "@/lib/pns";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; name: string; address: string }
  | { kind: "empty"; name: string }
  | { kind: "error"; message: string };

export function ResolveCard() {
  const [input, setInput] = useState("alice.pot");
  const [state, setState] = useState<State>({ kind: "idle" });

  const onResolve = async () => {
    const normalized = tryNormalize(input);
    if (!normalized) {
      setState({
        kind: "error",
        message:
          "Name failed normalization (look for zero-width, mixed-script, leading/trailing dot, or empty label).",
      });
      return;
    }
    setState({ kind: "loading" });
    try {
      const client = await getClient();
      const addr = await client.resolve(normalized);
      if (addr) setState({ kind: "ok", name: normalized, address: addr });
      else setState({ kind: "empty", name: normalized });
    } catch (e: any) {
      setState({ kind: "error", message: e?.message ?? String(e) });
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
        Name
      </label>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onResolve(); }}
          placeholder="alice.pot"
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 font-mono text-sm text-zinc-100 outline-none ring-pot-primary/40 focus:ring-2"
        />
        <button
          onClick={onResolve}
          disabled={state.kind === "loading"}
          className="rounded-lg bg-pot-primary px-5 py-3 text-sm font-medium text-white shadow transition hover:brightness-110 disabled:opacity-50"
        >
          {state.kind === "loading" ? "…" : "Resolve"}
        </button>
      </div>

      {state.kind === "ok" && (
        <Result label="Resolves to" value={state.address} sublabel={state.name} />
      )}
      {state.kind === "empty" && (
        <Result label="Not found" value={state.name} sublabel="No on-chain addr record for COIN_POT" muted />
      )}
      {state.kind === "error" && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      )}
    </div>
  );
}

function Result({
  label, value, sublabel, muted,
}: { label: string; value: string; sublabel?: string; muted?: boolean }) {
  return (
    <div className={
      "rounded-lg border px-4 py-3 " +
      (muted
        ? "border-zinc-800 bg-zinc-950/40"
        : "border-pot-accent/30 bg-pot-accent/5")
    }>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-zinc-100">{value}</p>
      {sublabel && (
        <p className="mt-1 text-xs text-zinc-500">{sublabel}</p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { getClient } from "@/lib/pns";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; address: string; name: string }
  | { kind: "empty"; address: string }
  | { kind: "error"; message: string };

export function ReverseCard() {
  const [input, setInput] = useState("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
  const [state, setState] = useState<State>({ kind: "idle" });

  const onReverse = async () => {
    if (!input.trim()) return;
    setState({ kind: "loading" });
    try {
      const client = await getClient();
      const name = await client.reverse(input.trim());
      if (name) setState({ kind: "ok", address: input.trim(), name });
      else setState({ kind: "empty", address: input.trim() });
    } catch (e: any) {
      setState({ kind: "error", message: e?.message ?? String(e) });
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
        SS58 address
      </label>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onReverse(); }}
          placeholder="5..."
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 font-mono text-sm text-zinc-100 outline-none ring-pot-primary/40 focus:ring-2"
        />
        <button
          onClick={onReverse}
          disabled={state.kind === "loading"}
          className="rounded-lg bg-pot-primary px-5 py-3 text-sm font-medium text-white shadow transition hover:brightness-110 disabled:opacity-50"
        >
          {state.kind === "loading" ? "…" : "Reverse"}
        </button>
      </div>

      {state.kind === "ok" && (
        <div className="rounded-lg border border-pot-accent/30 bg-pot-accent/5 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Primary name <span className="text-zinc-600">(forward-verified)</span>
          </p>
          <p className="mt-1 font-mono text-sm text-zinc-100">{state.name}</p>
          <p className="mt-1 break-all text-xs text-zinc-500">{state.address}</p>
        </div>
      )}
      {state.kind === "empty" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            No verified primary name
          </p>
          <p className="mt-1 break-all font-mono text-sm text-zinc-300">{state.address}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Either no reverse record, or it doesn't forward-verify back to this
            address. Spoofed reverse records are silently dropped.
          </p>
        </div>
      )}
      {state.kind === "error" && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      )}
    </div>
  );
}

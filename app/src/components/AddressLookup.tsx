"use client";

import { useState } from "react";
import { useNetwork } from "@/lib/network-context";
import { shortAddr } from "@/lib/format";
import { Button, inputClass } from "@/components/ui";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; address: string; name: string }
  | { kind: "empty"; address: string }
  | { kind: "error"; message: string };

export function AddressLookup() {
  const { net, getClient } = useNetwork();
  const [input, setInput] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const lookup = async () => {
    const addr = input.trim();
    if (!addr || !net.ready) return;
    setState({ kind: "loading" });
    try {
      const client = await getClient();
      const name = await client.reverse(addr);
      setState(name ? { kind: "ok", address: addr, name } : { kind: "empty", address: addr });
    } catch (e: unknown) {
      setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };

  if (!net.ready) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 text-sm text-ink-soft shadow-panel">
        <span className="font-medium text-ink">{net.label} is not live yet.</span>{" "}
        Switch to a live network to look up addresses.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="paste an SS58 address (5…)"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={`${inputClass} flex-1 rounded-2xl py-5 text-base shadow-panel focus:shadow-glow-lg`}
        />
        <Button onClick={lookup} loading={state.kind === "loading"} className="py-5 text-base sm:px-8">
          Look up
        </Button>
      </div>

      {state.kind === "ok" && (
        <div className="mt-5 rounded-2xl border border-line bg-surface p-6 shadow-panel pns-rise">
          <span className="inline-flex items-center gap-2 text-accent-ink">
            <CheckBadge />
            <span className="text-xs font-medium uppercase tracking-[0.16em]">
              Primary name · forward-verified
            </span>
          </span>
          <p className="mt-3 font-mono text-2xl text-ink">{state.name}</p>
          <p className="mt-1.5 break-all font-mono text-xs text-ink-faint">{state.address}</p>
        </div>
      )}

      {state.kind === "empty" && (
        <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-6 pns-rise">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-faint">
            No verified primary name
          </p>
          <p className="mt-2 break-all font-mono text-sm text-ink-soft">
            {shortAddr(state.address, 14, 12)}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Either there is no reverse record, or it does not forward-verify back
            to this address. Spoofed reverse records are dropped on purpose.
          </p>
        </div>
      )}

      {state.kind === "error" && (
        <div className="mt-5 rounded-2xl border border-danger/40 bg-danger-soft/40 px-5 py-4 text-sm text-danger pns-rise">
          {state.message}
        </div>
      )}
    </div>
  );
}

function CheckBadge() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2.5l2.4 1.7 2.9-.2 1 2.8 2.4 1.6-.7 2.9.7 2.9-2.4 1.6-1 2.8-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.8L3.3 15.6 4 12.7l-.7-2.9 2.4-1.6 1-2.8 2.9.2z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
      />
      <path d="M8.8 12.2l2.2 2.2 4.2-4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

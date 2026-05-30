"use client";

import { useState } from "react";
import { getClient } from "@/lib/pns";
import { shortAddr } from "@/lib/format";
import { Button, inputClass, CopyButton } from "@/components/ui";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; address: string; name: string }
  | { kind: "empty"; address: string }
  | { kind: "error"; message: string };

export function AddressLookup() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const lookup = async () => {
    const addr = input.trim();
    if (!addr) return;
    setState({ kind: "loading" });
    try {
      const client = await getClient();
      const name = await client.reverse(addr);
      setState(name ? { kind: "ok", address: addr, name } : { kind: "empty", address: addr });
    } catch (e: unknown) {
      setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };

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
          className={`${inputClass} flex-1 py-4 text-base`}
        />
        <Button onClick={lookup} loading={state.kind === "loading"} className="py-4 sm:px-7">
          Look up
        </Button>
      </div>

      {state.kind === "ok" && (
        <div className="mt-5 rounded-xl border border-line bg-panel p-5 shadow-panel pns-rise">
          <div className="flex items-center gap-2 text-accent-ink">
            <CheckBadge />
            <span className="text-xs font-medium uppercase tracking-[0.14em]">
              Primary name · forward-verified
            </span>
          </div>
          <p className="mt-3 font-mono text-xl text-ink">{state.name}</p>
          <p className="mt-1 break-all font-mono text-xs text-ink-faint">{state.address}</p>
        </div>
      )}

      {state.kind === "empty" && (
        <div className="mt-5 rounded-xl border border-line bg-inset p-5 pns-rise">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            No verified primary name
          </p>
          <p className="mt-2 break-all font-mono text-sm text-ink-soft">
            {shortAddr(state.address, 12, 12)}
          </p>
          <p className="mt-2.5 text-xs leading-relaxed text-ink-faint">
            Either there is no reverse record, or it does not forward-verify back
            to this address. Spoofed reverse records are dropped on purpose.
          </p>
        </div>
      )}

      {state.kind === "error" && (
        <div className="mt-5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3.5 text-sm text-danger pns-rise">
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

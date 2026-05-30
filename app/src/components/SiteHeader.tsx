"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useNetwork } from "@/lib/network-context";
import { NETWORK_ORDER, NETWORKS, type NetworkKey } from "@/lib/networks";
import { privyEnabled } from "@/components/Providers";
import { useSubstrateAccount } from "@/lib/use-account";
import { shortAddr } from "@/lib/format";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="group inline-flex items-center gap-2">
          <Glyph />
          <span className="font-mono text-[0.95rem] font-semibold tracking-tight text-ink">
            pns<span className="text-accent-ink">.pot</span>
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <NetworkSwitch />
          <NavLink href="/docs">Docs</NavLink>
          <NavLink href="/pitch">Pitch</NavLink>
          {privyEnabled && <AccountButton />}
        </div>
      </div>
    </header>
  );
}

function NetworkSwitch() {
  const { netKey, net, setNetwork } = useNetwork();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink-soft transition-colors duration-150 hover:border-line-strong hover:text-ink"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <NetDot networkKey={netKey} />
        {net.label}
        <Caret open={open} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-elevated p-1 shadow-lift"
        >
          {NETWORK_ORDER.map((key) => {
            const n = NETWORKS[key];
            const active = key === netKey;
            return (
              <li key={key}>
                <button
                  disabled={!n.ready}
                  onClick={() => {
                    setNetwork(key);
                    setOpen(false);
                  }}
                  className={
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 " +
                    (n.ready
                      ? "text-ink hover:bg-surface-2"
                      : "cursor-not-allowed text-ink-faint")
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <NetDot networkKey={key} />
                    {n.label}
                  </span>
                  {active ? (
                    <Check />
                  ) : !n.ready ? (
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wider text-ink-faint">
                      Soon
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
          <li className="px-2.5 pb-1.5 pt-2 text-[0.68rem] leading-snug text-ink-faint">
            Mainnet activates automatically once its contract addresses are set.
          </li>
        </ul>
      )}
    </div>
  );
}

function AccountButton() {
  const { ready, authenticated, login, logout, address } = useSubstrateAccount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!ready) {
    return <span className="px-2.5 py-1.5 text-sm text-ink-faint">…</span>;
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-on-accent shadow-glow transition-colors duration-150 hover:bg-accent-strong"
      >
        Sign in
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 font-mono text-sm text-ink-soft transition-colors duration-150 hover:border-line-strong hover:text-ink"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-ok" />
        {address ? shortAddr(address, 4, 4) : "wallet…"}
        <Caret open={open} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-elevated p-1 shadow-lift">
          {address && (
            <div className="px-2.5 py-2">
              <p className="text-[0.62rem] uppercase tracking-[0.16em] text-ink-faint">
                Your .pot account
              </p>
              <p className="mt-1 break-all font-mono text-xs text-ink-soft">
                {address}
              </p>
            </div>
          )}
          <button
            onClick={() => {
              navigator.clipboard?.writeText(address ?? "");
              setOpen(false);
            }}
            className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors duration-150 hover:bg-surface-2"
          >
            Copy address
          </button>
          <button
            onClick={() => {
              logout();
              setOpen(false);
            }}
            className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors duration-150 hover:bg-surface-2"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function NetDot({ networkKey }: { networkKey: NetworkKey }) {
  const ready = NETWORKS[networkKey].ready;
  return (
    <span
      className={
        "h-1.5 w-1.5 rounded-full " + (ready ? "bg-ok" : "bg-ink-faint")
      }
      style={ready ? { animation: "pns-pulse 2.4s ease-in-out infinite" } : undefined}
    />
  );
}

function NavLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "rounded-lg px-2.5 py-1.5 text-sm text-ink-soft transition-colors duration-150 hover:bg-surface hover:text-ink";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

function Glyph() {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-md bg-accent/15 ring-1 ring-inset ring-accent/30">
      <span className="h-2 w-2 rounded-[3px] bg-accent shadow-glow" />
    </span>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden
      className={"text-ink-faint transition-transform duration-150 " + (open ? "rotate-180" : "")}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="text-accent-ink">
      <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

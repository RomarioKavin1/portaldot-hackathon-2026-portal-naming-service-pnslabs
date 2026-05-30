"use client";

import Link from "next/link";
import { useState } from "react";
import { NameConsole } from "@/components/NameConsole";
import { AddressLookup } from "@/components/AddressLookup";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

type Mode = "mint" | "lookup";

export default function Home() {
  const [mode, setMode] = useState<Mode>("mint");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-28 pt-16 sm:pt-24">
        <header className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent-ink">
            Portaldot · naming registry
          </p>
          <h1 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-6xl">
            Own your name on Portaldot.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[0.98rem] leading-relaxed text-ink-soft">
            Mint a <span className="font-mono text-accent-ink">.pot</span> name
            and point it at your account, your records, your identity, readable
            across every dApp on the chain.
          </p>
        </header>

        <section className="mt-12">
          <div className="mb-4 flex justify-center">
            <div className="inline-flex rounded-xl border border-line bg-surface p-0.5">
              <ModeTab active={mode === "mint"} onClick={() => setMode("mint")}>
                Mint a name
              </ModeTab>
              <ModeTab active={mode === "lookup"} onClick={() => setMode("lookup")}>
                Look up an address
              </ModeTab>
            </div>
          </div>

          {mode === "mint" ? <NameConsole /> : <AddressLookup />}
        </section>

        <FeatureRow />

        <div className="mt-14 rounded-2xl border border-line bg-surface/60 p-6 text-center">
          <p className="text-sm text-ink-soft">
            Building on Portaldot? Resolve <span className="font-mono">.pot</span>{" "}
            names from your own app.
          </p>
          <Link
            href="/docs"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent shadow-glow transition-colors duration-150 hover:bg-accent-strong"
          >
            Read the SDK docs
            <Arrow />
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function FeatureRow() {
  const items = [
    {
      title: "One name, one identity",
      body: "Map a human handle to an account and records, resolved the same way by every dApp.",
    },
    {
      title: "Forward-verified reverse",
      body: "Address → name only resolves when the name points back. Spoofed records are dropped.",
    },
    {
      title: "Length-tier pricing",
      body: "Shorter names cost more, in POT, with annual rent and a grace period before release.",
    },
  ];
  return (
    <div className="mt-16 grid gap-3 sm:grid-cols-3">
      {items.map((f) => (
        <div key={f.title} className="rounded-xl border border-line bg-surface/50 p-5">
          <h3 className="text-sm font-medium text-ink">{f.title}</h3>
          <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink-faint">
            {f.body}
          </p>
        </div>
      ))}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={
        "rounded-[10px] px-4 py-2 text-sm font-medium transition-colors duration-150 " +
        (active ? "bg-elevated text-ink shadow-panel" : "text-ink-faint hover:text-ink")
      }
    >
      {children}
    </button>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

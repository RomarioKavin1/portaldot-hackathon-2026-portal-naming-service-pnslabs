"use client";

import { useState } from "react";
import { ResolveCard } from "@/components/ResolveCard";
import { ReverseCard } from "@/components/ReverseCard";

export default function Home() {
  const [tab, setTab] = useState<"resolve" | "reverse">("resolve");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-5xl font-semibold tracking-tight">
          <span className="text-white">portal</span>
          <span className="text-pot-primary">.pot</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
          ENS-style decentralised naming for the Portaldot chain. One human
          name, one address, one identity — across every dApp.
        </p>
      </header>

      <div className="mb-6 inline-flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 backdrop-blur-sm">
        <TabButton active={tab === "resolve"} onClick={() => setTab("resolve")}>
          Resolve name
        </TabButton>
        <TabButton active={tab === "reverse"} onClick={() => setTab("reverse")}>
          Reverse address
        </TabButton>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm">
        {tab === "resolve" ? <ResolveCard /> : <ReverseCard />}
      </div>

      <footer className="mt-16 text-xs text-zinc-500">
        Connected to{" "}
        <code className="rounded bg-zinc-800/60 px-1.5 py-0.5 font-mono text-zinc-300">
          wss://portaldot.philotheephilix.in
        </code>{" "}
        — dev node, state resets on restart.
      </footer>
    </main>
  );
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-lg px-4 py-2 text-sm font-medium transition " +
        (active
          ? "bg-pot-primary text-white shadow"
          : "text-zinc-400 hover:text-zinc-200")
      }
    >
      {children}
    </button>
  );
}

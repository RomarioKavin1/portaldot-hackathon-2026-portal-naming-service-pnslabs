"use client";

import { useState } from "react";
import { NameConsole } from "@/components/NameConsole";
import { AddressLookup } from "@/components/AddressLookup";
import { SdkDocs } from "@/components/SdkDocs";

const NODE =
  process.env.NEXT_PUBLIC_PORTALDOT_WSS ?? "wss://portaldot.philotheephilix.in";
const REPO = "https://github.com/RomarioKavin1/PortalNamingService";

type Mode = "name" | "address";

export default function Home() {
  const [mode, setMode] = useState<Mode>("name");

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto max-w-2xl px-6 pb-24 pt-14 sm:pt-20">
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-ink">
            Portaldot · naming registry
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            One name, one address,
            <br className="hidden sm:block" /> one identity.
          </h1>
          <p className="mt-4 max-w-prose text-[0.95rem] leading-relaxed text-ink-soft">
            <span className="font-mono text-accent-ink">.pot</span> names map a
            human-readable handle to an account across every Portaldot dApp.
            Search to claim one, or look up who owns a name.
          </p>
        </header>

        <section className="mt-9">
          <div className="mb-3.5 inline-flex rounded-lg border border-line bg-inset p-0.5">
            <ModeTab active={mode === "name"} onClick={() => setMode("name")}>
              Search a name
            </ModeTab>
            <ModeTab active={mode === "address"} onClick={() => setMode("address")}>
              Look up an address
            </ModeTab>
          </div>

          {mode === "name" ? <NameConsole /> : <AddressLookup />}
        </section>

        <hr className="my-16 border-line" />

        <SdkDocs />
      </main>

      <Footer node={NODE} repo={REPO} />
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3.5">
        <a href="/" className="font-mono text-[0.95rem] font-semibold tracking-tight text-ink">
          pns<span className="text-accent-ink">.pot</span>
        </a>
        <nav className="flex items-center gap-1">
          <NavLink href="#sdk">SDK</NavLink>
          <NavLink href="https://www.npmjs.com/package/portaldot-pns" external>
            npm
          </NavLink>
          <NavLink href="https://github.com/RomarioKavin1/PortalNamingService" external>
            GitHub
          </NavLink>
        </nav>
      </div>
    </header>
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
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="rounded-md px-2.5 py-1.5 text-sm text-ink-soft transition-colors duration-150 hover:bg-inset hover:text-ink"
    >
      {children}
    </a>
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
        "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 " +
        (active ? "bg-panel text-ink shadow-sm" : "text-ink-faint hover:text-ink")
      }
    >
      {children}
    </button>
  );
}

function Footer({ node, repo }: { node: string; repo: string }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-6 py-8 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-accent"
            style={{ animation: "pns-pulse 2.4s ease-in-out infinite" }}
          />
          <code className="font-mono text-ink-soft">{node}</code>
          <span className="text-ink-faint">· dev node, resets on restart</span>
        </span>
        <a
          href={repo}
          target="_blank"
          rel="noreferrer"
          className="text-ink-soft underline-offset-2 hover:text-ink hover:underline"
        >
          Source &amp; contracts
        </a>
      </div>
    </footer>
  );
}

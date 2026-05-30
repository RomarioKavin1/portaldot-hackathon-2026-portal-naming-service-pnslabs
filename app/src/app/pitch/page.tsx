"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/* ──────────────────────────────────────────────────────────────────────── */
/* Pitch deck — 7 slides, keyboard-navigable.                                */
/* Arrows / Space / PageUp/Down to navigate. G/Home/End to jump. Esc → /.    */
/* Built from /pitch/SCRIPT.md + SLIDES.md + ASK.md (3-min hackathon arc).   */
/* ──────────────────────────────────────────────────────────────────────── */

const SLIDES: { id: string; render: () => React.ReactNode }[] = [
  { id: "title", render: TitleSlide },
  { id: "problem", render: ProblemSlide },
  { id: "solution", render: SolutionSlide },
  { id: "demo", render: DemoSlide },
  { id: "scale", render: ScaleSlide },
  { id: "business", render: BusinessSlide },
  { id: "ask", render: AskSlide },
];

const TOTAL = SLIDES.length;

export default function Pitch() {
  const [i, setI] = useState(0);

  const go = useCallback((next: number) => {
    setI((cur) => {
      if (next < 0) return 0;
      if (next >= TOTAL) return TOTAL - 1;
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          setI((c) => Math.min(c + 1, TOTAL - 1));
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          setI((c) => Math.max(c - 1, 0));
          break;
        case "Home":
        case "g":
          setI(0);
          break;
        case "End":
        case "G":
          setI(TOTAL - 1);
          break;
        case "Escape":
          window.location.href = "/";
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const slide = SLIDES[i];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-paper text-ink">
      {/* Slide stage */}
      <main key={slide.id} className="pns-rise flex flex-1 items-center justify-center px-8 sm:px-14">
        <div className="w-full max-w-6xl">{slide.render()}</div>
      </main>

      {/* Chrome — counter, dots, controls, hint */}
      <footer className="flex items-center justify-between gap-6 border-t border-line bg-surface/40 px-6 py-3.5 text-xs text-ink-faint backdrop-blur">
        <div className="flex items-center gap-3 font-mono">
          <Link href="/" className="text-ink-soft transition-colors hover:text-ink">
            pns<span className="text-accent-ink">.pot</span>
          </Link>
          <span className="text-line-strong">·</span>
          <span>
            {String(i + 1).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
          </span>
        </div>

        <ProgressDots i={i} onJump={go} />

        <div className="hidden items-center gap-3 sm:flex">
          <NavBtn onClick={() => go(i - 1)} disabled={i === 0} label="prev" arrow="←" />
          <NavBtn onClick={() => go(i + 1)} disabled={i === TOTAL - 1} label="next" arrow="→" />
          <span className="ml-3 hidden font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint lg:inline">
            ← → · space · esc
          </span>
        </div>
      </footer>
    </div>
  );
}

/* ── Chrome bits ─────────────────────────────────────────────────────── */

function ProgressDots({ i, onJump }: { i: number; onJump: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {SLIDES.map((s, idx) => (
        <button
          key={s.id}
          onClick={() => onJump(idx)}
          aria-label={`go to slide ${idx + 1}: ${s.id}`}
          className={
            "h-1.5 rounded-full transition-all duration-200 " +
            (idx === i
              ? "w-7 bg-accent shadow-glow"
              : idx < i
                ? "w-3 bg-accent-soft"
                : "w-3 bg-line hover:bg-line-strong")
          }
        />
      ))}
    </div>
  );
}

function NavBtn({
  onClick,
  disabled,
  label,
  arrow,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  arrow: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-surface"
    >
      <span className="text-sm leading-none">{arrow}</span>
      {label}
    </button>
  );
}

/* ── Shared slide primitives ────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-accent-ink">
      {children}
    </p>
  );
}

function H({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2
      className={
        "text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl " +
        className
      }
    >
      {children}
    </h2>
  );
}

/* ── 1. Title ───────────────────────────────────────────────────────── */

function TitleSlide() {
  return (
    <div className="text-center">
      <SectionLabel>Portaldot S1 · Onchain identity & coordination</SectionLabel>

      <h1 className="mx-auto mt-10 text-balance text-7xl font-semibold leading-[1.02] tracking-tight sm:text-[7.5rem]">
        Portal <span className="text-accent-ink">Naming</span> Service
      </h1>

      <p className="mx-auto mt-9 max-w-2xl text-pretty text-lg leading-relaxed text-ink-soft sm:text-xl">
        ENS for Portaldot. One name. Every dApp. Native ink!.
      </p>

      <div className="mx-auto mt-14 inline-flex flex-col items-stretch gap-3 rounded-2xl border border-line bg-surface/80 p-5 text-left shadow-lift sm:flex-row sm:items-center sm:gap-5">
        <code className="font-mono text-base text-ink-faint sm:text-lg">
          5GrwvaEF5zXb26Fz9rcQpDWS57Ct…HGKutQY
        </code>
        <span className="hidden text-accent-ink sm:inline">→</span>
        <span className="text-center text-2xl text-accent-ink sm:hidden">↓</span>
        <code className="rounded-lg bg-accent-soft px-3 py-2 font-mono text-2xl text-on-accent shadow-glow">
          alice.pot
        </code>
      </div>

      <p className="mt-12 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
        pnslabs · romario kavin (protocol, dApp) · sairam (contracts)
      </p>
    </div>
  );
}

/* ── 2. Problem ─────────────────────────────────────────────────────── */

function ProblemSlide() {
  return (
    <div>
      <SectionLabel>The problem</SectionLabel>
      <H className="mt-5">
        Portaldot has <span className="text-accent-ink">no ENS</span>.
      </H>
      <p className="mt-6 max-w-3xl text-pretty text-xl leading-relaxed text-ink-soft">
        Every transaction, every payment, every dApp lives or dies by a
        47-character SS58 string. One typo and the funds are gone.
      </p>

      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        <Card title="Who hurts">
          Every Portaldot user. Every dApp builder. Every wallet that ships a
          send screen.
        </Card>
        <Card title="How bad">
          ENS on Ethereum handles{" "}
          <span className="text-ink">~3M names</span> and stops billions in
          mis-sends a year. Portaldot has none.
        </Card>
        <Card title="Why not solved">
          Portaldot is non-EVM — you can't fork ENS. The stack is 2021-era
          ink! 3.0.0-rc3 + cargo-contract 0.12. Built native, from scratch.
        </Card>
      </div>

      <div className="mt-10 inline-flex items-center gap-3 rounded-xl border border-line bg-surface px-5 py-3.5 text-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        <span className="text-ink-soft">
          <span className="font-medium text-ink">Why now:</span> Portaldot just
          opened to builders. First naming = de-facto identity layer for
          everything that ships next.
        </span>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-5 shadow-panel">
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-accent-ink">
        {title}
      </p>
      <p className="mt-2.5 text-base leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

/* ── 3. Solution ────────────────────────────────────────────────────── */

function SolutionSlide() {
  return (
    <div>
      <SectionLabel>What we shipped</SectionLabel>
      <H className="mt-5">
        Six ink! contracts, wired <span className="text-accent-ink">ENS-style</span>,
        native on Portaldot.
      </H>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr,1fr]">
        {/* Architecture */}
        <div className="rounded-2xl border border-line bg-surface/70 p-6 shadow-panel">
          <p className="mb-4 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-accent-ink">
            Architecture
          </p>
          <pre className="overflow-x-auto font-mono text-[0.78rem] leading-relaxed text-ink">
{`Registry            ← single source of truth
   │
   ├── PotRegistrar         .pot ownership, expiry
   │      ◀── RegistrarController
   │             commit-reveal · POT rent
   │
   ├── PublicResolver       addr / text / name
   │
   ├── ReverseRegistrar     addr → primary name
   │                        forward-verified
   │
   └── SubnameRegistrar     subnames + fuses-lite`}
          </pre>
        </div>

        {/* Three guarantees */}
        <div className="grid content-start gap-4">
          <Guarantee
            kicker="namehash"
            text="blake2_256 — byte-identical across the Rust contract, the TS SDK, and the Python SDK. Verified on three implementations."
          />
          <Guarantee
            kicker="registration"
            text="Commit–reveal. No one can front-run your name."
          />
          <Guarantee
            kicker="reverse"
            text="Every addr → name lookup is forward-verified. Spoofed reverse records are dropped."
          />
        </div>
      </div>
    </div>
  );
}

function Guarantee({ kicker, text }: { kicker: string; text: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface/60 p-5">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-accent-ink">
        {kicker}
      </p>
      <p className="mt-1.5 text-base leading-relaxed text-ink-soft">{text}</p>
    </div>
  );
}

/* ── 4. Demo ────────────────────────────────────────────────────────── */

function DemoSlide() {
  return (
    <div className="text-center">
      <SectionLabel>Live demo · 75 seconds</SectionLabel>
      <H className="mt-5">
        Switch to the dApp <span className="text-accent-ink">→ /</span>
      </H>

      <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
        <Beat
          n="1"
          title="Mint"
          body="Type a name. Search shows AVAILABLE with the length-tier price in POT. Sign in with Google — wallet is created in-app, no extension. Commit, wait the reveal window, register."
        />
        <Beat
          n="2"
          title="Resolve"
          body="The new name resolves forward to your address. Set it as your primary. Reverse lookup now returns the name, marked FORWARD-VERIFIED."
        />
        <Beat
          n="3"
          title="Integrate"
          body={
            <>
              Three lines of TypeScript:{" "}
              <code className="font-mono text-accent-ink">await pns.resolve(&quot;alice.pot&quot;)</code>
              . Any Portaldot dApp gets name resolution today.
            </>
          }
        />
      </div>

      <div className="mt-10 inline-flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-on-accent shadow-glow transition-colors hover:bg-accent-strong"
        >
          Open the dApp
          <span aria-hidden>→</span>
        </Link>
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink"
        >
          Read the SDK docs
        </Link>
      </div>
    </div>
  );
}

function Beat({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-5 shadow-panel">
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full border border-accent-soft bg-accent-soft/30 font-mono text-xs text-accent-ink">
          {n}
        </span>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-ink">{title}</p>
      </div>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

/* ── 5. Scale ───────────────────────────────────────────────────────── */

function ScaleSlide() {
  return (
    <div>
      <SectionLabel>Scale</SectionLabel>
      <H className="mt-5">
        Naming infrastructure <span className="text-accent-ink">compounds</span>.
      </H>
      <p className="mt-6 max-w-3xl text-pretty text-xl leading-relaxed text-ink-soft">
        Two names on chain today. The same architecture handles a million
        with no migration.
      </p>

      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        <Metric value="~0.03" unit="POT / read" label="Per-call resolver cost — same on day 1 as day 10,000." />
        <Metric value="100" unit="KiB Wasm" label="Resolver fits in one contract. Hot-swappable behind the registry." />
        <Metric value="0" unit="migrations" label="Registry indirection means resolvers upgrade with zero name moves." />
      </div>

      <p className="mt-10 max-w-3xl text-base leading-relaxed text-ink-faint">
        Whoever ships naming first becomes the default identity layer. Every
        wallet, every payment, every subname after that compounds on the same
        registry.
      </p>
    </div>
  );
}

function Metric({
  value,
  unit,
  label,
}: {
  value: string;
  unit: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-6 shadow-panel">
      <p className="font-mono text-4xl text-ink sm:text-5xl">{value}</p>
      <p className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-accent-ink">
        {unit}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{label}</p>
    </div>
  );
}

/* ── 6. Business ────────────────────────────────────────────────────── */

function BusinessSlide() {
  return (
    <div>
      <SectionLabel>Revenue · baked into the spec</SectionLabel>
      <H className="mt-5">
        Three streams, <span className="text-accent-ink">100% in POT</span>.
      </H>

      <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-surface/70 shadow-panel">
        <Row
          stream="Length-tier rent"
          detail="Annual rent per name — shorter names cost more. Per-spec §5."
          amount="640 / 160 / 40 / 5"
          unit="POT / year"
        />
        <Row
          stream="Premium auction"
          detail="Dutch auction on expired premium names. v2 path."
          amount="market"
          unit="POT"
        />
        <Row
          stream="Subname protocol fee"
          detail="Small percentage on paid subname self-mints."
          amount="≤ 5%"
          unit="of mint"
          last
        />
      </div>

      <p className="mt-8 max-w-3xl text-base leading-relaxed text-ink-soft">
        All proceeds accrue to a <span className="text-ink">Portaldot-controlled treasury</span>.
        Naming pays for itself, and pays back the chain that hosts it.
      </p>
    </div>
  );
}

function Row({
  stream,
  detail,
  amount,
  unit,
  last,
}: {
  stream: string;
  detail: string;
  amount: string;
  unit: string;
  last?: boolean;
}) {
  return (
    <div
      className={
        "grid grid-cols-[1fr,auto] items-center gap-5 px-6 py-5 sm:grid-cols-[1.4fr,1fr,auto] " +
        (last ? "" : "border-b border-line")
      }
    >
      <div>
        <p className="text-base font-medium text-ink">{stream}</p>
        <p className="mt-1 text-sm text-ink-faint">{detail}</p>
      </div>
      <p className="hidden font-mono text-xl text-accent-ink sm:block">{amount}</p>
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-faint">
        {unit}
      </p>
    </div>
  );
}

/* ── 7. Ask ─────────────────────────────────────────────────────────── */

function AskSlide() {
  return (
    <div>
      <SectionLabel>What we need from Portaldot</SectionLabel>
      <H className="mt-5">
        Three asks. <span className="text-accent-ink">30 days each.</span>
      </H>

      <div className="mt-10 grid gap-4">
        <Ask
          n="1"
          title="Persistent testnet endpoint"
          body="The public dev node resets — every reset wipes user names. A testnet RPC with persistent state lets real users keep names across sessions."
        />
        <Ask
          n="2"
          title="Wallet integration conversation"
          body="A 30-minute chat with the Portaldot wallet team about embedding pns.resolve() in the send flow. SDK is ~3KB tree-shaken, zero-dep outside @polkadot/api."
        />
        <Ask
          n="3"
          title="Bigger pallet-contracts code_size cap"
          body="Bump the runtime cap to 256 KiB so PaymentRecord + ProfileRecord land in v1.1 without surgery."
        />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent-soft/50 bg-accent-soft/10 px-6 py-5">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-accent-ink">
            Open source · live today
          </p>
          <p className="mt-2 text-lg text-ink">
            Type a name. Get an address. Welcome to Portaldot.
          </p>
        </div>
        <a
          href="https://github.com/RomarioKavin1/PortalNamingService"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-on-accent shadow-glow transition-colors hover:bg-accent-strong"
        >
          github.com / PortalNamingService
          <span aria-hidden>↗</span>
        </a>
      </div>
    </div>
  );
}

function Ask({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="flex gap-5 rounded-2xl border border-line bg-surface/70 p-5 shadow-panel">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-accent-soft bg-accent-soft/30 font-mono text-sm text-accent-ink">
        {n}
      </span>
      <div>
        <p className="text-lg font-medium text-ink">{title}</p>
        <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-soft">{body}</p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { SmoothScroll } from "@/components/SmoothScroll";

/* ------------------------------------------------------------------ *
 * PNS investor pitch — a single smooth-scrolling page.
 *
 * Structure follows the YC / Sequoia sequence (Problem → Solution → Why
 * Now → Market → Product → Traction → Model → Competition → Team → Ask).
 * Lenis (see SmoothScroll) drives the inertial scroll; each section reveals
 * on intersection, and the right-rail dots scrollTo through the Lenis
 * instance so the nav respects the same smoothing.
 * ------------------------------------------------------------------ */

const SLIDES = [
  { id: "title", label: "PNS" },
  { id: "problem", label: "Problem" },
  { id: "solution", label: "Solution" },
  { id: "why-now", label: "Why now" },
  { id: "market", label: "Market" },
  { id: "product", label: "Product" },
  { id: "traction", label: "Traction" },
  { id: "model", label: "Model" },
  { id: "competition", label: "Edge" },
  { id: "team", label: "Team" },
  { id: "ask", label: "Ask" },
] as const;

export default function PitchPage() {
  return (
    <SmoothScroll>
      <Progress />
      <RailNav />
      <main className="relative">
        <Title />
        <Problem />
        <Solution />
        <WhyNow />
        <Market />
        <Product />
        <Traction />
        <Model />
        <Competition />
        <Team />
        <Ask />
      </main>
    </SmoothScroll>
  );
}

/* ------------------------------- chrome ------------------------------- */

/** Thin top progress bar tracking page scroll. */
function Progress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? h.scrollTop / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent">
      <div
        className="h-full bg-accent shadow-glow transition-[width] duration-150 ease-out"
        style={{ width: `${p * 100}%` }}
      />
    </div>
  );
}

/** Right-rail section dots; active dot tracks the section in view. */
function RailNav() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = SLIDES.findIndex((s) => s.id === e.target.id);
            if (i >= 0) setActive(i);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    SLIDES.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: 0 });
    else el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="fixed right-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-end gap-3 md:flex">
      {SLIDES.map((s, i) => (
        <button
          key={s.id}
          onClick={() => go(s.id)}
          className="group flex items-center gap-2.5"
          aria-label={s.label}
        >
          <span
            className={`font-mono text-[11px] uppercase tracking-[0.16em] transition-all duration-300 ${
              i === active
                ? "text-accent-ink opacity-100"
                : "text-ink-faint opacity-0 group-hover:opacity-100"
            }`}
          >
            {s.label}
          </span>
          <span
            className={`h-px transition-all duration-300 ${
              i === active
                ? "w-7 bg-accent"
                : "w-3.5 bg-line-strong group-hover:bg-ink-faint"
            }`}
          />
        </button>
      ))}
    </nav>
  );
}

/** Reveal-on-scroll wrapper: fades + lifts children into view once. */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

/** Full-height section shell with consistent padding + eyebrow. */
function Section({
  id,
  eyebrow,
  children,
  className = "",
}: {
  id: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`relative flex min-h-screen flex-col justify-center px-6 py-24 sm:px-10 md:px-20 ${className}`}
    >
      <div className="mx-auto w-full max-w-5xl">
        {eyebrow && (
          <Reveal>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.22em] text-accent-ink">
              {eyebrow}
            </p>
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}

/* ------------------------------- slides ------------------------------- */

function Title() {
  return (
    <section
      id="title"
      className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      {/* soft radial glow behind the wordmark */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: "var(--accent-glow)" }}
      />
      <Reveal>
        <p className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-ink-faint">
          pnslabs · seed
        </p>
      </Reveal>
      <Reveal delay={120}>
        <h1 className="text-6xl font-semibold tracking-tight text-ink sm:text-8xl">
          pns<span className="text-accent-ink">.pot</span>
        </h1>
      </Reveal>
      <Reveal delay={240}>
        <p className="mt-6 max-w-xl text-balance text-lg text-ink-soft sm:text-2xl">
          The naming &amp; identity layer for Portaldot. One{" "}
          <span className="font-mono text-accent-ink">.pot</span> name is your
          account, your profile, and your payment address.
        </p>
      </Reveal>
      <Reveal delay={380}>
        <button
          onClick={() => window.__lenis?.scrollTo("#problem")}
          className="mt-12 inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 font-mono text-sm text-ink-soft transition-colors hover:border-accent/60 hover:text-ink"
        >
          scroll
          <span className="inline-block animate-bounce">↓</span>
        </button>
      </Reveal>
    </section>
  );
}

function Problem() {
  return (
    <Section id="problem" eyebrow="The problem">
      <Reveal>
        <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          Crypto addresses are{" "}
          <span className="text-accent-ink">unusable by humans.</span>
        </h2>
      </Reveal>
      <Reveal delay={140}>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-panel">
          <p className="break-all font-mono text-sm text-ink-faint sm:text-base">
            5Gg7tZDAPRUyoouUzeM1oo3K4migHxH31gcgXUqLS1AoErcZ
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            48 characters. One typo sends funds to the void. You cannot read it,
            remember it, or trust it at a glance.
          </p>
        </div>
      </Reveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {[
          ["No identity", "An account is a hash. No name, no profile, no reputation travels with it."],
          ["Payments are fragile", "Every transfer is a copy-paste leap of faith across a 48-char string."],
          ["Portaldot had no answer", "A live chain with a real community — and no native naming primitive at all."],
        ].map(([h, b], i) => (
          <Reveal key={h} delay={i * 110}>
            <div className="h-full rounded-2xl border border-line bg-surface-2 p-5">
              <p className="font-medium text-ink">{h}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Solution() {
  return (
    <Section id="solution" eyebrow="The solution">
      <Reveal>
        <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          <span className="font-mono text-accent-ink">alice.pot</span> resolves
          to everything.
        </h2>
      </Reveal>
      <Reveal delay={140}>
        <p className="mt-6 max-w-2xl text-lg text-ink-soft">
          PNS is ENS, faithfully rebuilt for Portaldot as five ink! smart
          contracts. A human-readable name maps to an account — and carries
          records, a profile, payments, and programmable subnames with it.
        </p>
      </Reveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {[
          ["Forward resolution", "alice.pot → account + address records, normalized and Blake2_256-namehashed on chain."],
          ["Reverse + identity", "account → primary name, forward-verified so it can't be spoofed. Profile/text records included."],
          ["Name-based payments", "Send to alice.pot, not to a 48-char hash. The name is the rail."],
          ["Programmable subnames", "pay.alice.pot, dao.alice.pot — issued with fuses-lite permissioning."],
        ].map(([h, b], i) => (
          <Reveal key={h} delay={i * 90}>
            <div className="h-full rounded-2xl border border-line bg-surface p-6 shadow-panel">
              <p className="font-medium text-ink">{h}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function WhyNow() {
  return (
    <Section id="why-now" eyebrow="Why now">
      <Reveal>
        <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          The chain is live. The primitive is missing.
        </h2>
      </Reveal>
      <div className="mt-10 space-y-5">
        {[
          ["Portaldot is in production", "Mainnet runs today on a Substrate 3.0.0 runtime with pallet-contracts. Users and balances are real — naming is the obvious gap."],
          ["ENS proved the demand", "ENS turned naming into one of crypto's stickiest primitives. Every serious chain needs its own. Portaldot's is unclaimed."],
          ["We solved the hard part", "Building 2021-era ink! in 2026 is a brick wall. We have a reproducible toolchain and a deployed contract suite. The moat is the build."],
        ].map(([h, b], i) => (
          <Reveal key={h} delay={i * 110}>
            <div className="flex gap-5 rounded-2xl border border-line bg-surface p-6 shadow-panel">
              <span className="font-mono text-2xl text-accent-ink">
                0{i + 1}
              </span>
              <div>
                <p className="font-medium text-ink">{h}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {b}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Market() {
  const rows = [
    ["TAM", "On-chain naming & identity", "Every L1/L2 needs a name layer; ENS alone has registered millions of names."],
    ["SAM", "Substrate / Polkadot-family chains", "Dozens of app-chains with no ink!-native ENS equivalent."],
    ["SOM", "Portaldot accounts", "Every account on the chain is a candidate name + renewal."],
  ];
  return (
    <Section id="market" eyebrow="Market">
      <Reveal>
        <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          Naming is{" "}
          <span className="text-accent-ink">per-chain infrastructure.</span>
        </h2>
      </Reveal>
      <Reveal delay={120}>
        <p className="mt-6 max-w-2xl text-lg text-ink-soft">
          It is not winner-take-all across chains — it is winner-take-most{" "}
          <em>within</em> a chain. We are first on Portaldot, with a design that
          ports to any pallet-contracts runtime.
        </p>
      </Reveal>
      <div className="mt-10 space-y-3">
        {rows.map(([k, t, d], i) => (
          <Reveal key={k} delay={i * 100}>
            <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-6 shadow-panel sm:flex-row sm:items-center sm:gap-6">
              <span className="w-16 font-mono text-lg text-accent-ink">{k}</span>
              <span className="flex-1 font-medium text-ink">{t}</span>
              <span className="flex-1 text-sm text-ink-soft">{d}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Product() {
  return (
    <Section id="product" eyebrow="Product · live today">
      <Reveal>
        <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          Search. Mint. Resolve. <span className="text-accent-ink">Shipped.</span>
        </h2>
      </Reveal>
      <Reveal delay={120}>
        <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
          <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
            <span className="ml-3 font-mono text-xs text-ink-faint">pns.pot</span>
          </div>
          <div className="p-8">
            <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-surface-2">
              <div className="flex-1 px-5 py-4 font-mono text-lg text-ink">
                alice
                <span className="ml-0.5 inline-block h-5 w-px translate-y-1 animate-pulse bg-accent" />
              </div>
              <span className="flex items-center pr-5 font-mono text-lg text-accent-ink">
                .pot
              </span>
              <div className="flex items-center bg-accent px-6 font-medium text-on-accent">
                Search
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-ok-soft bg-ok-soft/30 px-4 py-3 text-sm">
              <span className="text-ok">●</span>
              <span className="text-ink-soft">
                <span className="font-mono text-ink">alice.pot</span> is
                available — mint for 5 POT / year.
              </span>
            </div>
          </div>
        </div>
      </Reveal>
      <Reveal delay={220}>
        <p className="mt-6 font-mono text-sm text-ink-faint">
          Live dApp · 5 ink! contracts deployed on testnet ·{" "}
          <span className="text-accent-ink">npm: portaldot-pns</span>
        </p>
      </Reveal>
    </Section>
  );
}

function Traction() {
  const stats = [
    ["5", "ink! contracts deployed & wired on testnet"],
    ["1", "working dApp — mint, resolve, reverse, subnames"],
    ["0→1", "first naming service ever on Portaldot"],
  ];
  return (
    <Section id="traction" eyebrow="Traction">
      <Reveal>
        <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          From blocked toolchain to a live deployment.
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {stats.map(([n, l], i) => (
          <Reveal key={l} delay={i * 120}>
            <div className="rounded-2xl border border-line bg-surface p-7 text-center shadow-panel">
              <p className="text-5xl font-semibold tracking-tight text-accent-ink">
                {n}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{l}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={200}>
        <p className="mt-8 max-w-2xl text-ink-soft">
          The registry, .pot registrar, commit-reveal controller, public
          resolver, reverse registrar, and subname registrar are all on chain
          and talking to each other. The hard, undifferentiated work — a
          reproducible 2021-era ink! build — is done.
        </p>
      </Reveal>
    </Section>
  );
}

function Model() {
  const tiers = [
    ["5+ chars", "5 POT / yr", "the long tail of names"],
    ["4 chars", "40 POT / yr", "scarcer, priced up"],
    ["3 chars", "160 POT / yr", "premium"],
    ["1–2 chars", "640 POT / yr", "ultra-rare"],
  ];
  return (
    <Section id="model" eyebrow="Business model">
      <Reveal>
        <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          Length-priced registrations,{" "}
          <span className="text-accent-ink">renewed every year.</span>
        </h2>
      </Reveal>
      <Reveal delay={120}>
        <p className="mt-6 max-w-2xl text-lg text-ink-soft">
          Recurring POT revenue that scales with adoption. Shorter names cost
          more — the ENS-proven curve that funds the protocol and a treasury.
        </p>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map(([len, price, note], i) => (
          <Reveal key={len} delay={i * 90}>
            <div className="h-full rounded-2xl border border-line bg-surface p-6 shadow-panel">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-faint">
                {len}
              </p>
              <p className="mt-3 text-2xl font-semibold text-accent-ink">
                {price}
              </p>
              <p className="mt-2 text-sm text-ink-soft">{note}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Competition() {
  return (
    <Section id="competition" eyebrow="Why we win">
      <Reveal>
        <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          ENS can&apos;t follow us here.
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-2xl border border-line bg-surface-2 p-7">
            <p className="font-mono text-sm uppercase tracking-[0.16em] text-ink-faint">
              ENS / EVM naming
            </p>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              <li>— EVM-only; Portaldot is non-EVM Substrate.</li>
              <li>— No path to pallet-contracts without a rebuild.</li>
              <li>— Solidity, not ink!.</li>
            </ul>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="h-full rounded-2xl border border-accent/40 bg-surface p-7 shadow-glow">
            <p className="font-mono text-sm uppercase tracking-[0.16em] text-accent-ink">
              PNS
            </p>
            <ul className="mt-4 space-y-3 text-sm text-ink">
              <li className="text-accent-ink">— Native ink! on Portaldot.</li>
              <li>— ENS-faithful architecture, ported, not faked.</li>
              <li>— Reproducible 2021-toolchain build — our real moat.</li>
              <li>— First mover with the contracts already live.</li>
            </ul>
          </div>
        </Reveal>
      </div>
      <Reveal delay={200}>
        <p className="mt-8 text-ink-soft">
          The competition isn&apos;t another team — it&apos;s the{" "}
          <span className="text-ink">build barrier</span>. We already climbed it.
        </p>
      </Reveal>
    </Section>
  );
}

function Team() {
  return (
    <Section id="team" eyebrow="Team">
      <Reveal>
        <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          pnslabs
        </h2>
      </Reveal>
      <Reveal delay={120}>
        <p className="mt-6 max-w-2xl text-lg text-ink-soft">
          We reverse-engineered Portaldot&apos;s runtime, resurrected a 2021 ink!
          toolchain that the docs themselves get wrong, and shipped a full ENS
          port — contracts, SDKs (TypeScript + Python), and a live dApp — end to
          end.
        </p>
      </Reveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {[
          ["Protocol", "ink! 3.0-rc3 contracts, Blake2_256 namehash, commit-reveal."],
          ["Tooling", "Dockerized frozen-index build; substrate-interface deploy scripts."],
          ["Product", "Next.js dApp, Privy-backed signing, TS + Py SDKs on npm/PyPI."],
        ].map(([h, b], i) => (
          <Reveal key={h} delay={i * 100}>
            <div className="h-full rounded-2xl border border-line bg-surface p-6 shadow-panel">
              <p className="font-medium text-accent-ink">{h}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Ask() {
  return (
    <section
      id="ask"
      className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[55vh] w-[55vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl"
        style={{ background: "var(--accent-glow)" }}
      />
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent-ink">
          The ask
        </p>
      </Reveal>
      <Reveal delay={120}>
        <h2 className="mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          Own the name layer of an entire chain.
        </h2>
      </Reveal>
      <Reveal delay={240}>
        <div className="mt-10 grid w-full max-w-2xl gap-4 sm:grid-cols-3">
          {[
            ["Contracts", "Subname fuses + treasury"],
            ["Go-to-market", "Wallets + dApp integrations"],
            ["Mainnet", "Audited launch + renewals"],
          ].map(([h, b]) => (
            <div
              key={h}
              className="rounded-2xl border border-line bg-surface p-5 text-left shadow-panel"
            >
              <p className="font-medium text-ink">{h}</p>
              <p className="mt-1.5 text-sm text-ink-soft">{b}</p>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal delay={360}>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <a
            href="/"
            className="rounded-full bg-accent px-7 py-3 font-medium text-on-accent shadow-glow transition-transform hover:scale-[1.03]"
          >
            Try the live dApp
          </a>
          <span className="font-mono text-sm text-ink-faint">
            pnslabs · hello@pns.pot
          </span>
        </div>
      </Reveal>
    </section>
  );
}

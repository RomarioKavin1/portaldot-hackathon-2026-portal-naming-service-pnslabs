"use client";

import { useEffect, useRef, useState } from "react";
import { SmoothScroll } from "@/components/SmoothScroll";
import {
  CoinDoodle,
  CoinStack,
  Dashes,
  KeyDoodle,
  LockDoodle,
  MagnifierDoodle,
  NameTag,
  ScribbleUnderline,
  ShieldDoodle,
  SignpostDoodle,
  SketchDefs,
  TreeDoodle,
  WalletDoodle,
} from "@/components/doodles";
import { Eyebrow } from "@/components/ui";

/* ------------------------------------------------------------------ *
 * PNS investor pitch — single smooth-scrolling page.
 * YC sequence: Problem → Solution → Why Now → Market → Product
 *              → Traction → Model → Competition → Team → Ask.
 * Keyboard: ↓ Enter Space Tab → next section; ↑ Shift+Tab → prev.
 * Esc → home.
 * ------------------------------------------------------------------ */

const SLIDES = [
  { id: "title", label: "pns" },
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

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (window.__lenis) window.__lenis.scrollTo(el);
  else el.scrollIntoView({ behavior: "smooth" });
}

export default function PitchPage() {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  // Track active section via intersection.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = SLIDES.findIndex((s) => s.id === e.target.id);
            if (i >= 0) {
              setActive(i);
              activeRef.current = i;
            }
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

  // Keyboard navigation: ↓ / Enter / Space / PageDown → next, ↑ / PageUp → prev.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't steal keys while typing in inputs/textareas.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const isNext = e.key === "ArrowDown" || e.key === "Enter" || e.key === " " || e.key === "PageDown";
      const isPrev = e.key === "ArrowUp" || e.key === "PageUp";
      if (isNext) {
        e.preventDefault();
        const next = Math.min(SLIDES.length - 1, activeRef.current + 1);
        if (next !== activeRef.current) {
          activeRef.current = next;
          scrollToSection(SLIDES[next].id);
        }
      } else if (isPrev) {
        e.preventDefault();
        const prev = Math.max(0, activeRef.current - 1);
        if (prev !== activeRef.current) {
          activeRef.current = prev;
          scrollToSection(SLIDES[prev].id);
        }
      } else if (e.key === "Home" || e.key === "g") {
        e.preventDefault();
        activeRef.current = 0;
        scrollToSection(SLIDES[0].id);
      } else if (e.key === "End" || e.key === "G") {
        e.preventDefault();
        activeRef.current = SLIDES.length - 1;
        scrollToSection(SLIDES[SLIDES.length - 1].id);
      } else if (e.key === "Escape") {
        window.location.href = "/";
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <SmoothScroll>
      <SketchDefs />
      <Progress />
      <RailNav active={active} />
      <KeyHint />
      <main style={{ position: "relative" }}>
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

/* ---- chrome ---- */

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
    <div style={{ position: "fixed", left: 0, right: 0, top: 0, height: 4, zIndex: 80 }}>
      <div
        style={{
          height: "100%",
          background: "var(--ink)",
          transition: "width 150ms ease-out",
          width: `${p * 100}%`,
          opacity: 0.85,
        }}
      />
    </div>
  );
}

function RailNav({ active }: { active: number }) {
  return (
    <nav
      style={{
        position: "fixed",
        right: 22,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "flex-end",
      }}
      aria-label="Pitch section nav"
    >
      {SLIDES.map((s, i) => (
        <button
          key={s.id}
          onClick={() => scrollToSection(s.id)}
          aria-label={s.label}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 0,
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              opacity: i === active ? 1 : 0,
              color: "var(--ink)",
              fontWeight: 700,
              transition: "opacity .25s",
            }}
          >
            {s.label}
          </span>
          <span
            style={{
              display: "block",
              height: 1.5,
              width: i === active ? 28 : 14,
              background: i === active ? "var(--ink)" : "var(--line-strong)",
              transition: "all .25s",
              borderRadius: 2,
            }}
          />
        </button>
      ))}
    </nav>
  );
}

function KeyHint() {
  return (
    <div
      className="mono"
      style={{
        position: "fixed",
        left: 18,
        bottom: 18,
        zIndex: 50,
        background: "rgba(26,23,20,0.06)",
        border: "1px solid var(--line-soft)",
        borderRadius: 99,
        padding: "7px 13px",
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--ink-soft)",
        fontWeight: 700,
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      <span>↑ ↓ · enter · esc</span>
    </div>
  );
}

function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
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
      style={{
        transition: "opacity .7s ease-out, transform .7s ease-out",
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(28px)",
        transitionDelay: shown ? `${delay}ms` : "0ms",
      }}
    >
      {children}
    </div>
  );
}

function Section({
  id,
  bg = "card-paper",
  children,
}: {
  id: string;
  bg?: "card-paper" | "card-blush" | "card-mint" | "card-peach";
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={"card " + bg}
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "100px 5vw 100px",
        borderRadius: 0,
        boxShadow: "none",
        overflow: "hidden",
      }}
    >
      <div className="wrap" style={{ maxWidth: 1080, position: "relative", zIndex: 2 }}>
        {children}
      </div>
    </section>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Reveal>
      <div style={{ marginBottom: 22 }}>
        <Eyebrow>{children}</Eyebrow>
      </div>
    </Reveal>
  );
}

/* ---- slides ---- */

function Title() {
  return (
    <Section id="title" bg="card-blush">
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 50, alignItems: "center" }}>
        <div>
          <Reveal>
            <Eyebrow>pnslabs · seed</Eyebrow>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="display" style={{ fontSize: "clamp(72px,10vw,148px)", margin: "20px 0 0" }}>
              pns<span style={{ color: "var(--ink-soft)" }}>.pot</span>
            </h1>
          </Reveal>
          <Reveal delay={240}>
            <p className="lead" style={{ fontSize: 22, marginTop: 26, maxWidth: 540 }}>
              The naming & identity layer for Portaldot. One{" "}
              <span className="mono" style={{ color: "var(--ink)", fontWeight: 700 }}>.pot</span> name is your account, your profile, and your payment address.
            </p>
          </Reveal>
          <Reveal delay={380}>
            <div className="row gap-12" style={{ marginTop: 28, flexWrap: "wrap" }}>
              <a
                href="https://github.com/RomarioKavin1/portaldot-hackathon-2026-portal-naming-service-pnslabs"
                target="_blank"
                rel="noreferrer"
                className="chip"
                style={{ textDecoration: "none", color: "var(--ink)" }}
              >
                github.com/…/portal-naming-service-pnslabs ↗
              </a>
              <span className="chip">npm · portaldot-pns</span>
            </div>
          </Reveal>
        </div>
        <div className="floaty" style={{ display: "grid", placeItems: "center" }}>
          <NameTag size={260} />
        </div>
      </div>
    </Section>
  );
}

function Problem() {
  return (
    <Section id="problem" bg="card-peach">
      <SectionEyebrow>The problem</SectionEyebrow>
      <Reveal>
        <h2 className="display" style={{ fontSize: "clamp(40px,5.5vw,76px)", margin: "0 0 26px", maxWidth: 900 }}>
          Crypto addresses are{" "}
          <span className="scribble-u">
            unusable
            <ScribbleUnderline />
          </span>{" "}
          by humans.
        </h2>
      </Reveal>
      <Reveal delay={140}>
        <div
          className="mono"
          style={{
            fontSize: "clamp(16px,2.4vw,28px)",
            fontWeight: 700,
            wordBreak: "break-all",
            background: "var(--paper)",
            padding: "20px 24px",
            borderRadius: 18,
            border: "2px solid var(--ink)",
            maxWidth: 980,
            position: "relative",
          }}
        >
          5Gg7tZDAPRUyoouUzeM1oo3K4migHxH31gcgXUqLS1AoErcZ
          <div
            className="body-txt"
            style={{
              fontSize: 13.5,
              marginTop: 10,
              fontWeight: 500,
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
            }}
          >
            48 characters. One typo sends funds to the void. You cannot read it, remember it, or trust it at a glance.
          </div>
        </div>
      </Reveal>
      <div className="row gap-22" style={{ marginTop: 30, flexWrap: "wrap" }}>
        {[
          { d: <MagnifierDoodle size={56} />, t: "No identity", b: "An account is a hash. No name, no profile, no reputation travels with it." },
          { d: <WalletDoodle size={56} />, t: "Payments are fragile", b: "Every transfer is a copy-paste leap of faith across a 48-char string." },
          { d: <LockDoodle size={56} />, t: "Portaldot had no answer", b: "A live chain with a real community — and no native naming primitive at all." },
        ].map((x, i) => (
          <Reveal key={x.t} delay={i * 100}>
            <Pillar doodle={x.d} t={x.t} b={x.b} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Solution() {
  return (
    <Section id="solution" bg="card-mint">
      <SectionEyebrow>The solution</SectionEyebrow>
      <Reveal>
        <h2 className="display" style={{ fontSize: "clamp(40px,5.5vw,78px)", margin: "0 0 22px", maxWidth: 900 }}>
          <span className="mono" style={{ color: "var(--ink)" }}>alice.pot</span> resolves to everything.
        </h2>
      </Reveal>
      <Reveal delay={140}>
        <p className="lead" style={{ fontSize: 20, maxWidth: 640 }}>
          PNS is ENS, faithfully rebuilt for Portaldot as <b>six ink! smart contracts</b>. A human-readable name maps to an account — and carries records, a profile, payments, and programmable subnames with it.
        </p>
      </Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 30 }}>
        {[
          { d: <SignpostDoodle size={48} />, t: "Forward resolution", b: "alice.pot → account + address records, normalized and blake2_256-namehashed on chain." },
          { d: <ShieldDoodle size={48} accent="#FBFAF8" />, t: "Reverse + identity", b: "account → primary name, forward-verified so it can't be spoofed. Profile/text records included." },
          { d: <CoinStack size={48} />, t: "Name-based payments", b: "Send to alice.pot, not to a 48-char hash. The name is the rail." },
          { d: <TreeDoodle size={48} />, t: "Programmable subnames", b: "pay.alice.pot, dao.alice.pot — issued with fuses-lite permissioning." },
        ].map((x, i) => (
          <Reveal key={x.t} delay={i * 80}>
            <RowCard doodle={x.d} t={x.t} b={x.b} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function WhyNow() {
  return (
    <Section id="why-now" bg="card-blush">
      <SectionEyebrow>Why now</SectionEyebrow>
      <Reveal>
        <h2 className="display" style={{ fontSize: "clamp(40px,5.5vw,76px)", margin: "0 0 26px", maxWidth: 900 }}>
          The chain is live. The primitive is missing.
        </h2>
      </Reveal>
      <div className="col gap-16" style={{ marginTop: 14 }}>
        {[
          ["Portaldot is in production", "Mainnet runs today on a Substrate 3.0.0 runtime with pallet-contracts. Users and balances are real — naming is the obvious gap."],
          ["ENS proved the demand", "ENS turned naming into one of crypto's stickiest primitives. Every serious chain needs its own. Portaldot's is unclaimed."],
          ["We solved the hard part", "Building 2021-era ink! in 2026 is a brick wall. We have a reproducible toolchain and a deployed contract suite. The moat is the build."],
        ].map(([h, b], i) => (
          <Reveal key={h} delay={i * 110}>
            <div
              className="card card-paper"
              style={{
                padding: "22px 26px",
                display: "flex",
                gap: 22,
                alignItems: "flex-start",
                border: "1.5px solid var(--line)",
              }}
            >
              <span className="display" style={{ fontSize: 32, color: "var(--ink-soft)", flex: "0 0 auto" }}>
                0{i + 1}
              </span>
              <div>
                <div className="display" style={{ fontSize: 22 }}>{h}</div>
                <p className="body-txt" style={{ fontSize: 14.5, marginTop: 5, margin: 0 }}>{b}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Market() {
  const rows: [string, string, string][] = [
    ["TAM", "On-chain naming & identity", "Every L1/L2 needs a name layer; ENS alone has registered millions of names."],
    ["SAM", "Substrate / Polkadot-family chains", "Dozens of app-chains with no ink!-native ENS equivalent."],
    ["SOM", "Portaldot accounts", "Every account on the chain is a candidate name + renewal."],
  ];
  return (
    <Section id="market" bg="card-mint">
      <SectionEyebrow>Market</SectionEyebrow>
      <Reveal>
        <h2 className="display" style={{ fontSize: "clamp(40px,5.5vw,76px)", margin: "0 0 22px", maxWidth: 900 }}>
          Naming is per-chain infrastructure.
        </h2>
      </Reveal>
      <Reveal delay={120}>
        <p className="lead" style={{ fontSize: 20, maxWidth: 640 }}>
          Not winner-take-all across chains — winner-take-most <i>within</i> a chain. We are first on Portaldot, with a design that ports to any pallet-contracts runtime.
        </p>
      </Reveal>
      <div className="col gap-14" style={{ marginTop: 30 }}>
        {rows.map(([k, t, d], i) => (
          <Reveal key={k} delay={i * 100}>
            <div
              className="card card-paper"
              style={{
                padding: "22px 26px",
                display: "flex",
                gap: 24,
                alignItems: "center",
                flexWrap: "wrap",
                border: "1.5px solid var(--line)",
              }}
            >
              <span className="display" style={{ fontSize: 26, color: "var(--ink-soft)", minWidth: 70 }}>{k}</span>
              <span className="display" style={{ fontSize: 20, flex: 1, minWidth: 200 }}>{t}</span>
              <span className="body-txt" style={{ fontSize: 14, flex: 1.4, minWidth: 240 }}>{d}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Product() {
  return (
    <Section id="product" bg="card-peach">
      <SectionEyebrow>Product · live today</SectionEyebrow>
      <Reveal>
        <h2 className="display" style={{ fontSize: "clamp(40px,5.5vw,76px)", margin: "0 0 22px", maxWidth: 900 }}>
          Search. Mint. Resolve.{" "}
          <span className="scribble-u">
            Shipped.
            <ScribbleUnderline />
          </span>
        </h2>
      </Reveal>
      <Reveal delay={120}>
        <div
          className="card card-paper"
          style={{ marginTop: 18, padding: 0, border: "1.5px solid var(--line)", overflow: "hidden" }}
        >
          <div className="row spread" style={{ padding: "12px 16px", borderBottom: "1.5px solid var(--line-soft)" }}>
            <Dashes widths={[26, 18, 22, 12]} />
            <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>pns.pot</span>
          </div>
          <div style={{ padding: "32px 28px" }}>
            <div className="field" style={{ maxWidth: 560 }}>
              <input value="alice" readOnly style={{ caretColor: "var(--ink)" }} />
              <span className="suffix">.pot</span>
              <span className="btn btn-dark">Search</span>
            </div>
            <div
              className="row gap-10"
              style={{
                marginTop: 16,
                padding: "12px 16px",
                background: "var(--mint)",
                borderRadius: 14,
                border: "1.5px solid var(--mint-deep)",
                alignItems: "center",
              }}
            >
              <span className="tag tag-ok" style={{ fontSize: 11 }}>Available</span>
              <span className="body-txt" style={{ fontSize: 14, color: "var(--ink)" }}>
                <span className="mono" style={{ fontWeight: 700 }}>alice.pot</span> · mint for 5 POT / year
              </span>
            </div>
          </div>
        </div>
      </Reveal>
      <Reveal delay={220}>
        <p className="body-txt" style={{ marginTop: 18, fontSize: 14 }}>
          Live dApp · 6 ink! contracts deployed on testnet ·{" "}
          <span className="mono" style={{ color: "var(--ink)", fontWeight: 700 }}>npm: portaldot-pns</span>
        </p>
      </Reveal>
    </Section>
  );
}

function Traction() {
  const stats: [string, string][] = [
    ["6", "ink! contracts deployed & wired on testnet"],
    ["1", "working dApp — mint, resolve, reverse, subnames"],
    ["0→1", "first naming service ever on Portaldot"],
  ];
  return (
    <Section id="traction" bg="card-mint">
      <SectionEyebrow>Traction</SectionEyebrow>
      <Reveal>
        <h2 className="display" style={{ fontSize: "clamp(40px,5.5vw,76px)", margin: "0 0 26px", maxWidth: 900 }}>
          From blocked toolchain to a live deployment.
        </h2>
      </Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
        {stats.map(([n, l], i) => (
          <Reveal key={l} delay={i * 100}>
            <div
              className="card card-paper"
              style={{
                padding: "26px 24px",
                textAlign: "center",
                border: "1.5px solid var(--line)",
              }}
            >
              <div className="display" style={{ fontSize: 64 }}>{n}</div>
              <p className="body-txt" style={{ fontSize: 14, marginTop: 8 }}>{l}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={220}>
        <p className="body-txt" style={{ fontSize: 15.5, marginTop: 24, maxWidth: 720 }}>
          The registry, .pot registrar, commit-reveal controller, public resolver, reverse registrar, and subname registrar are all on chain and talking to each other. The hard, undifferentiated work — a reproducible 2021-era ink! build — is done.
        </p>
      </Reveal>
    </Section>
  );
}

function Model() {
  const tiers: [string, string, string][] = [
    ["5+ chars", "5", "the long tail"],
    ["4 chars", "40", "scarcer, priced up"],
    ["3 chars", "160", "premium"],
    ["1–2 chars", "640", "ultra-rare"],
  ];
  return (
    <Section id="model" bg="card-peach">
      <SectionEyebrow>Business model</SectionEyebrow>
      <Reveal>
        <h2 className="display" style={{ fontSize: "clamp(40px,5.5vw,76px)", margin: "0 0 22px", maxWidth: 900 }}>
          Length-priced registrations, renewed every year.
        </h2>
      </Reveal>
      <Reveal delay={120}>
        <p className="lead" style={{ fontSize: 20, maxWidth: 640 }}>
          Recurring <b>POT</b> revenue that scales with adoption. Shorter names cost more — the ENS-proven curve that funds the protocol and a treasury.
        </p>
      </Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginTop: 30 }}>
        {tiers.map(([len, price, note], i) => (
          <Reveal key={len} delay={i * 80}>
            <div
              className="card card-paper"
              style={{ padding: "20px 20px 22px", border: "1.5px solid var(--line)" }}
            >
              <div className="body-txt" style={{ fontSize: 13 }}>{len}</div>
              <div className="display" style={{ fontSize: 40, margin: "6px 0 2px" }}>{price}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>POT / year</div>
              <div className="body-txt" style={{ fontSize: 12, marginTop: 8, color: "var(--ink-faint)" }}>{note}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Competition() {
  return (
    <Section id="competition" bg="card-blush">
      <SectionEyebrow>Why we win</SectionEyebrow>
      <Reveal>
        <h2 className="display" style={{ fontSize: "clamp(40px,5.5vw,76px)", margin: "0 0 26px", maxWidth: 900 }}>
          ENS can&apos;t follow us here.
        </h2>
      </Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <Reveal>
          <div className="card card-paper" style={{ padding: "26px 28px", border: "1.5px solid var(--line)" }}>
            <Eyebrow>ENS / EVM naming</Eyebrow>
            <ul style={{ marginTop: 16, paddingLeft: 18, color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.7 }}>
              <li>EVM-only; Portaldot is non-EVM Substrate.</li>
              <li>No path to pallet-contracts without a rebuild.</li>
              <li>Solidity, not ink!.</li>
            </ul>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div
            className="card card-mint"
            style={{
              padding: "26px 28px",
              border: "2px solid var(--ink)",
              boxShadow: "0 24px 50px -22px rgba(40,30,25,0.45)",
            }}
          >
            <Eyebrow>PNS</Eyebrow>
            <ul
              style={{
                marginTop: 16,
                paddingLeft: 18,
                color: "var(--ink)",
                fontSize: 14.5,
                lineHeight: 1.7,
                fontWeight: 600,
              }}
            >
              <li>Native ink! on Portaldot.</li>
              <li>ENS-faithful architecture, ported, not faked.</li>
              <li>Reproducible 2021-toolchain build — our real moat.</li>
              <li>First mover, with the contracts already live.</li>
            </ul>
          </div>
        </Reveal>
      </div>
      <Reveal delay={220}>
        <p className="body-txt" style={{ fontSize: 16, marginTop: 26 }}>
          The competition isn&apos;t another team — it&apos;s the <b>build barrier</b>. We already climbed it.
        </p>
      </Reveal>
    </Section>
  );
}

function Team() {
  return (
    <Section id="team" bg="card-mint">
      <SectionEyebrow>Team</SectionEyebrow>
      <Reveal>
        <h2 className="display" style={{ fontSize: "clamp(48px,7vw,98px)", margin: "0 0 22px" }}>pnslabs</h2>
      </Reveal>
      <Reveal delay={120}>
        <p className="lead" style={{ fontSize: 20, maxWidth: 720 }}>
          We reverse-engineered Portaldot&apos;s runtime, resurrected a 2021 ink! toolchain that the docs themselves get wrong, and shipped a full ENS port — contracts, SDKs (TypeScript + Python), and a live dApp — end to end.
        </p>
      </Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginTop: 28 }}>
        {[
          { d: <KeyDoodle size={50} />, t: "Protocol", b: "ink! 3.0-rc3 contracts, blake2_256 namehash, commit-reveal." },
          { d: <CoinDoodle size={50} />, t: "Tooling", b: "Dockerized frozen-index build; substrate-interface deploy scripts." },
          { d: <NameTag size={50} />, t: "Product", b: "Next.js dApp, Privy-backed signing, TS + Py SDKs on npm/PyPI." },
        ].map((x, i) => (
          <Reveal key={x.t} delay={i * 100}>
            <div
              className="card card-paper"
              style={{
                padding: "22px 24px",
                border: "1.5px solid var(--line)",
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: "0 0 auto" }}>{x.d}</div>
              <div>
                <div className="display" style={{ fontSize: 20 }}>{x.t}</div>
                <p className="body-txt" style={{ fontSize: 14, marginTop: 5, margin: 0 }}>{x.b}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Ask() {
  return (
    <Section id="ask" bg="card-peach">
      <div style={{ textAlign: "center", position: "relative" }}>
        <Reveal>
          <Eyebrow>The ask</Eyebrow>
        </Reveal>
        <Reveal delay={120}>
          <h2
            className="display"
            style={{ fontSize: "clamp(48px,7vw,102px)", margin: "22px auto 26px", maxWidth: 1000 }}
          >
            Own the name layer of an{" "}
            <span className="scribble-u">
              entire chain
              <ScribbleUnderline />
            </span>
            .
          </h2>
        </Reveal>
        <Reveal delay={240}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 16,
              maxWidth: 760,
              margin: "0 auto",
            }}
          >
            {[
              ["Contracts", "Subname fuses + treasury"],
              ["Go-to-market", "Wallets + dApp integrations"],
              ["Mainnet", "Audited launch + renewals"],
            ].map(([h, b]) => (
              <div
                key={h}
                className="card card-paper"
                style={{ padding: "20px 22px", textAlign: "left", border: "1.5px solid var(--line)" }}
              >
                <div className="display" style={{ fontSize: 20 }}>{h}</div>
                <p className="body-txt" style={{ fontSize: 13.5, marginTop: 4, margin: 0 }}>{b}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={380}>
          <div className="row gap-12" style={{ marginTop: 36, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/" className="btn btn-dark btn-lg" style={{ textDecoration: "none" }}>
              Try the live dApp
            </a>
            <span className="mono" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              pnslabs · hello@pns.pot
            </span>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ── shared atoms ── */

function Pillar({ doodle, t, b }: { doodle: React.ReactNode; t: string; b: string }) {
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ marginBottom: 10 }}>{doodle}</div>
      <div className="display" style={{ fontSize: 22 }}>{t}</div>
      <p className="body-txt" style={{ fontSize: 14, marginTop: 4, margin: 0, maxWidth: 300 }}>{b}</p>
    </div>
  );
}

function RowCard({ doodle, t, b }: { doodle: React.ReactNode; t: string; b: string }) {
  return (
    <div
      className="card card-paper"
      style={{
        padding: "22px 24px",
        border: "1.5px solid var(--line)",
        display: "flex",
        gap: 18,
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: "0 0 auto" }}>{doodle}</div>
      <div>
        <div className="display" style={{ fontSize: 21 }}>{t}</div>
        <p className="body-txt" style={{ fontSize: 14, marginTop: 4, margin: 0 }}>{b}</p>
      </div>
    </div>
  );
}

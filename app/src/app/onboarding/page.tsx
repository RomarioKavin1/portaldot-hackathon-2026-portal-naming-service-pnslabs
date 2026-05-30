"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dashes,
  NameTag,
  ScribbleUnderline,
  SignpostDoodle,
  SketchDefs,
  Sparkle,
  Ticks,
  VaultDoodle,
} from "@/components/doodles";
import { Btn, Eyebrow } from "@/components/ui";

type CardSpec = {
  bg: "card-blush" | "card-mint" | "card-peach";
  head: [string, string];
  Doodle: () => React.ReactNode;
  body: React.ReactNode;
  cta: string;
  micro: React.ReactNode;
};

const CARDS: CardSpec[] = [
  {
    bg: "card-blush",
    head: ["Name", "It"],
    Doodle: () => <NameTag size={150} />,
    body: (
      <>
        Turn a <b>48-character address</b> into a name you can read, type, and actually trust.
      </>
    ),
    cta: "Search names",
    micro: (
      <>
        Already minted? <b>Open my names</b>
      </>
    ),
  },
  {
    bg: "card-mint",
    head: ["Own", "It"],
    Doodle: () => <VaultDoodle size={158} />,
    body: (
      <>
        Commit, reveal, <b>mint on-chain.</b> Front-running-resistant registration makes the name truly yours.
      </>
    ),
    cta: "Register a name",
    micro: (
      <>
        How does pricing work? <b>See tiers</b>
      </>
    ),
  },
  {
    bg: "card-peach",
    head: ["Use", "It"],
    Doodle: () => <SignpostDoodle size={150} />,
    body: (
      <>
        Point your name at <b>addresses, profiles & subnames</b> — one identity across the whole ecosystem.
      </>
    ),
    cta: "Enter the app",
    micro: (
      <>
        New to Portaldot? <b>Read the docs</b>
      </>
    ),
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  return (
    <>
      <SketchDefs />
      <div
        className="view-in"
        style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "40px 0" }}
      >
        <div
          className="wrap"
          style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 50, alignItems: "center" }}
        >
          <div style={{ maxWidth: 460 }}>
            <Eyebrow>Mobile onboarding</Eyebrow>
            <h1 className="display" style={{ fontSize: 78, margin: "18px 0 8px" }}>
              Names<br />in your{" "}
              <span className="scribble-u">
                pocket
                <ScribbleUnderline />
              </span>
            </h1>
            <p className="lead" style={{ maxWidth: 400, marginTop: 18 }}>
              Three taps from a wall of hex to a name you own. The same commit–reveal mint, the same on-chain records —
              just friendlier. Swipe the phone to flip through.
            </p>
            <div className="row gap-12" style={{ marginTop: 26 }}>
              <Btn variant="dark" onClick={() => router.push("/")}>Try it on desktop</Btn>
              <Btn variant="ghost" onClick={() => router.push("/docs")}>Read the SDK docs</Btn>
            </div>
            <div className="row gap-32" style={{ marginTop: 40 }}>
              <MiniStat n="3" l="quick steps" />
              <MiniStat n="48 → 7" l="chars, typically" />
              <MiniStat n=".pot" l="one identity" />
            </div>
          </div>
          <OnboardingPhone onEnter={() => router.push("/")} />
        </div>
      </div>
    </>
  );
}

function MiniStat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="display" style={{ fontSize: 30 }}>{n}</div>
      <div className="body-txt" style={{ fontSize: 13 }}>{l}</div>
    </div>
  );
}

function PhoneFrame({ children, w = 350, h = 700 }: { children: React.ReactNode; w?: number; h?: number }) {
  return (
    <div style={{ position: "relative", width: w, height: h, flex: "0 0 auto" }}>
      <div
        style={{
          position: "absolute",
          left: "8%",
          right: "8%",
          bottom: -22,
          height: 36,
          background: "rgba(40,30,25,0.28)",
          filter: "blur(26px)",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#0e0c0b",
          borderRadius: 52,
          padding: 11,
          boxShadow: "0 50px 90px -40px rgba(40,30,25,0.6), inset 0 0 0 2px #2a2724",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 42,
            overflow: "hidden",
            background: "var(--paper)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              width: 104,
              height: 30,
              background: "#0e0c0b",
              borderRadius: 999,
              zIndex: 30,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 26px",
              zIndex: 20,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 14,
              color: "var(--ink)",
            }}
          >
            <span>9:41</span>
            <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden>
                <rect x={0} y={7} width={3} height={4} rx={1} />
                <rect x={4.5} y={5} width={3} height={6} rx={1} />
                <rect x={9} y={2.5} width={3} height={8.5} rx={1} />
                <rect x={13.5} y={0} width={3} height={11} rx={1} />
              </svg>
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function OnboardingPhone({ onEnter }: { onEnter: () => void }) {
  const [i, setI] = useState(0);
  const startX = useRef<number | null>(null);
  const card = CARDS[i];
  const next = () => (i < CARDS.length - 1 ? setI(i + 1) : onEnter());

  return (
    <PhoneFrame>
      <div
        onPointerDown={(e) => {
          startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (startX.current == null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (dx < -45 && i < CARDS.length - 1) setI(i + 1);
          if (dx > 45 && i > 0) setI(i - 1);
        }}
        className={"card " + card.bg}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 0,
          boxShadow: "none",
          display: "flex",
          flexDirection: "column",
          padding: "58px 28px 22px",
          cursor: "grab",
          transition: "background .5s ease",
        }}
        key={i}
      >
        <div className="row spread" style={{ marginBottom: 22 }}>
          <Dashes widths={[26, 18, 22, 12]} />
          <span
            onClick={onEnter}
            style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", cursor: "pointer" }}
          >
            Skip
          </span>
        </div>

        <h1 className="display" style={{ fontSize: 62, margin: 0, marginBottom: 4 }}>
          {card.head[0]}<br />{card.head[1]}
        </h1>

        <div
          className="view-in"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
          key={"d" + i}
        >
          <div className="floaty">{card.Doodle()}</div>
          <div style={{ position: "absolute", top: "18%", right: "10%" }}>
            <Ticks size={40} />
          </div>
          <div style={{ position: "absolute", bottom: "16%", left: "8%" }}>
            <Sparkle size={32} />
          </div>
        </div>

        <p
          className="body-txt"
          style={{ fontSize: 17.5, lineHeight: 1.42, marginTop: 0, marginBottom: 18, maxWidth: 280 }}
        >
          {card.body}
        </p>

        <div className="row gap-16" style={{ alignItems: "center" }}>
          <Btn variant="dark" onClick={next} style={{ paddingLeft: 28, paddingRight: 28 }}>
            {card.cta}
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 8h9M8 4l4 4-4 4" />
            </svg>
          </Btn>
          <div className="microcta" style={{ maxWidth: 130 }}>{card.micro}</div>
        </div>

        <div className="row gap-8" style={{ marginTop: 18, justifyContent: "center" }}>
          {CARDS.map((_, k) => (
            <span
              key={k}
              onClick={() => setI(k)}
              style={{
                width: k === i ? 26 : 8,
                height: 8,
                borderRadius: 999,
                background: "var(--ink)",
                opacity: k === i ? 1 : 0.28,
                transition: "all .25s",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

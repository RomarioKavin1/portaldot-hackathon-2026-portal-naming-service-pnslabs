"use client";

/* Doodle library — hand-drawn SVG motifs.
   Clean paths + a displacement filter = marker wobble. */

const INK = "#1A1714";

/* Render ONCE near the root. Defines the sketch wobble filter. */
export function SketchDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <filter id="pns-sketch" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.017" numOctaves={2} seed={7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={2.6} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="pns-sketch2" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves={2} seed={2} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={1.8} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

function Sketch({
  size = 120,
  vb = 120,
  sw = 5.5,
  children,
  className = "",
  style,
  filt = "pns-sketch",
}: {
  size?: number;
  vb?: number;
  sw?: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  filt?: string;
}) {
  return (
    <svg
      className={"doodle " + className}
      width={size}
      height={size}
      viewBox={`0 0 ${vb} ${vb}`}
      fill="none"
      stroke={INK}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <g filter={`url(#${filt})`}>{children}</g>
    </svg>
  );
}

export function Dashes({ widths = [34, 22, 30, 14], color = INK }: { widths?: number[]; color?: string }) {
  let x = 2;
  const lines = widths.map((w, i) => {
    const el = <line key={i} x1={x} y1={5} x2={x + w} y2={5} />;
    x += w + 12;
    return el;
  });
  return (
    <svg className="doodle" width="150" height="10" viewBox="0 0 150 10" fill="none" stroke={color} strokeWidth={4.5} strokeLinecap="round">
      <g filter="url(#pns-sketch)" opacity={0.85}>
        {lines}
      </g>
    </svg>
  );
}

export function ScribbleUnderline({ color = INK }: { color?: string }) {
  return (
    <svg viewBox="0 0 200 16" preserveAspectRatio="none" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round">
      <g filter="url(#pns-sketch)">
        <path d="M4 9 C 40 3, 80 13, 120 7 S 180 4, 196 9" />
      </g>
    </svg>
  );
}

export function NameTag({ size = 130 }: { size?: number }) {
  return (
    <Sketch size={size} vb={130} sw={5.2}>
      <path d="M30 20 C 18 30, 26 44, 40 46" />
      <circle cx={29} cy={18} r={4} />
      <path d="M44 40 L104 58 Q112 60 110 68 L98 108 Q96 116 88 114 L36 98 Q30 96 31 89 L40 50 Q42 41 44 40 Z" fill="#FBFAF8" />
      <circle cx={50} cy={55} r={5.5} />
      <path d="M58 78 l34 10" />
      <path d="M56 88 l24 7" />
      <circle cx={50} cy={86} r={2.4} fill={INK} stroke="none" />
    </Sketch>
  );
}

export function KeyDoodle({ size = 130 }: { size?: number }) {
  return (
    <Sketch size={size} vb={130} sw={5.2}>
      <circle cx={40} cy={44} r={20} fill="#FBFAF8" />
      <circle cx={40} cy={44} r={7} />
      <path d="M55 56 L96 97" />
      <path d="M96 97 l10 -10" />
      <path d="M86 87 l9 -9" />
      <path d="M78 79 l7 -7" />
    </Sketch>
  );
}

export function CoinDoodle({ size = 120 }: { size?: number }) {
  return (
    <Sketch size={size} vb={120} sw={5}>
      <ellipse cx={60} cy={56} rx={38} ry={34} fill="#FBFAF8" />
      <ellipse cx={60} cy={56} rx={28} ry={25} />
      <path d="M53 44 l0 26 M53 44 q14 -1 14 8 q0 8 -14 7" />
      <path d="M22 56 q0 14 38 14 q38 0 38 -14" />
    </Sketch>
  );
}

export function CoinStack({ size = 130 }: { size?: number }) {
  return (
    <Sketch size={size} vb={130} sw={5}>
      <ellipse cx={65} cy={96} rx={38} ry={13} fill="#FBFAF8" />
      <path d="M27 96 v-12 M103 96 v-12 a38 13 0 0 1 -76 0" fill="#FBFAF8" />
      <ellipse cx={65} cy={74} rx={34} ry={12} fill="#FBFAF8" />
      <path d="M31 74 v-12 M99 74 v-12 a34 12 0 0 1 -68 0" fill="#FBFAF8" />
      <ellipse cx={65} cy={50} rx={30} ry={11} fill="#FBFAF8" />
      <path d="M53 44 l0 14 M53 44 q12 -1 12 5 q0 6 -12 5" />
    </Sketch>
  );
}

export function VaultDoodle({ size = 140, accent = "#E9F1C9" }: { size?: number; accent?: string }) {
  return (
    <Sketch size={size} vb={140} sw={5}>
      <path d="M60 8 l-3 14 M82 12 l-7 12 M98 24 l-11 9" />
      <path d="M30 38 L102 30 L118 44 L118 108 L46 116 L30 102 Z" fill="#FBFAF8" />
      <path d="M46 50 L118 44 L118 108 L46 116 Z" fill={INK} stroke="none" />
      <path d="M46 50 L118 44 L118 108 L46 116 Z" />
      <circle cx={82} cy={80} r={17} fill={accent} stroke="none" />
      <circle cx={82} cy={80} r={17} stroke={INK} />
      <circle cx={82} cy={80} r={6} stroke={INK} />
      <path d="M82 60 v-7 M82 100 v7 M62 80 h-7 M102 80 h7 M68 66 l-5 -5 M96 66 l5 -5 M68 94 l-5 5 M96 94 l5 5" stroke={INK} strokeWidth={3.4} />
      <path d="M50 116 l-3 9 M114 109 l3 9" />
    </Sketch>
  );
}

export function LockDoodle({ size = 120, locked = true }: { size?: number; locked?: boolean }) {
  return (
    <Sketch size={size} vb={120} sw={5}>
      <rect x={32} y={54} width={56} height={46} rx={9} fill="#FBFAF8" />
      <path d={locked ? "M44 54 v-12 a16 16 0 0 1 32 0 v12" : "M44 54 v-12 a16 16 0 0 1 30 -6"} />
      <circle cx={60} cy={74} r={6} fill={INK} stroke="none" />
      <path d="M60 78 l0 12" />
    </Sketch>
  );
}

export function SignpostDoodle({ size = 130 }: { size?: number }) {
  return (
    <Sketch size={size} vb={130} sw={5}>
      <path d="M62 26 L62 112" />
      <path d="M62 40 L100 40 L112 52 L100 64 L62 64 Z" fill="#FBFAF8" />
      <path d="M62 76 L24 76 L12 88 L24 100 L62 100 Z" fill="#FBFAF8" />
      <path d="M30 88 h22 M74 52 h22" strokeWidth={3.4} />
      <path d="M56 118 h12" />
    </Sketch>
  );
}

export function MagnifierDoodle({ size = 120 }: { size?: number }) {
  return (
    <Sketch size={size} vb={120} sw={5.2}>
      <circle cx={52} cy={50} r={30} fill="#FBFAF8" />
      <path d="M74 72 L100 98" />
      <path d="M100 98 q8 4 6 12" />
      <path d="M40 50 a12 12 0 0 1 12 -12" strokeWidth={3.4} />
    </Sketch>
  );
}

export function WalletDoodle({ size = 130 }: { size?: number }) {
  return (
    <Sketch size={size} vb={130} sw={5}>
      <rect x={22} y={40} width={86} height={62} rx={12} fill="#FBFAF8" />
      <path d="M22 56 q40 -22 86 0" />
      <path d="M88 70 a11 11 0 0 0 0 22 H112 V70 Z" fill={INK} stroke="none" />
      <path d="M88 70 a11 11 0 0 0 0 22 H112 V70 Z" />
      <circle cx={97} cy={81} r={3.4} stroke="#FBFAF8" />
    </Sketch>
  );
}

export function TreeDoodle({ size = 130 }: { size?: number }) {
  return (
    <Sketch size={size} vb={130} sw={4.8}>
      <circle cx={65} cy={28} r={14} fill="#FBFAF8" />
      <path d="M65 42 v16 M65 58 C 40 58, 30 66, 30 86 M65 58 C 90 58, 100 66, 100 86 M65 58 v22" />
      <circle cx={30} cy={98} r={12} fill="#FBFAF8" />
      <circle cx={65} cy={98} r={12} fill="#FBFAF8" />
      <circle cx={100} cy={98} r={12} fill="#FBFAF8" />
    </Sketch>
  );
}

export function ShieldDoodle({ size = 120, accent = "#E9F1C9" }: { size?: number; accent?: string }) {
  return (
    <Sketch size={size} vb={120} sw={5}>
      <path d="M60 16 L96 30 L96 62 C96 86 80 98 60 106 C40 98 24 86 24 62 L24 30 Z" fill={accent} />
      <path d="M60 16 L96 30 L96 62 C96 86 80 98 60 106 C40 98 24 86 24 62 L24 30 Z" />
      <path d="M44 60 l12 13 l22 -27" />
    </Sketch>
  );
}

export function ArrowCurve({ size = 80, dir = "right", color = INK }: { size?: number; dir?: "right" | "down" | "left" | "up"; color?: string }) {
  const t = { right: "0", down: "90", left: "180", up: "270" }[dir];
  return (
    <svg className="doodle" width={size} height={size} viewBox="0 0 80 80" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${t}deg)` }}>
      <g filter="url(#pns-sketch)">
        <path d="M12 50 C 26 22, 50 18, 66 30" />
        <path d="M66 30 l-14 -2 M66 30 l-3 14" />
      </g>
    </svg>
  );
}

export function Sparkle({ size = 50, color = INK }: { size?: number; color?: string }) {
  return (
    <svg className="doodle" width={size} height={size} viewBox="0 0 50 50" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round">
      <g filter="url(#pns-sketch)">
        <path d="M25 6 C 24 18, 22 22, 10 25 C 22 28, 24 32, 25 44 C 26 32, 28 28, 40 25 C 28 22, 26 18, 25 6 Z" fill={color} />
      </g>
    </svg>
  );
}

export function Ticks({ size = 44, color = INK }: { size?: number; color?: string }) {
  return (
    <svg className="doodle" width={size} height={size} viewBox="0 0 44 44" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round">
      <g filter="url(#pns-sketch)">
        <path d="M22 4 v9 M36 9 l-6 7 M40 24 l-9 1 M8 9 l6 7 M4 24 l9 1" />
      </g>
    </svg>
  );
}

export function StarDoodle({ size = 40, color = INK, fill = "none" }: { size?: number; color?: string; fill?: string }) {
  return (
    <svg className="doodle" width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round">
      <g filter="url(#pns-sketch)">
        <path d="M20 5 l4.5 9.5 L35 16 l-7.5 7 L29 33 l-9 -5 -9 5 1.5 -10 L5 16 l10.5 -1.5 Z" fill={fill} />
      </g>
    </svg>
  );
}

export function CheckDoodle({ size = 28, color = INK }: { size?: number; color?: string }) {
  return (
    <svg className="doodle" width={size} height={size} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
      <g filter="url(#pns-sketch2)">
        <path d="M5 15 l6 7 L23 7" />
      </g>
    </svg>
  );
}

export function LoopArrow({ size = 64, color = INK }: { size?: number; color?: string }) {
  return (
    <svg className="doodle" width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round">
      <g filter="url(#pns-sketch)">
        <path d="M50 24 A20 20 0 1 0 52 38" />
        <path d="M50 24 l-12 2 M50 24 l-2 12" />
      </g>
    </svg>
  );
}

export function Dot({ size = 12, color = INK }: { size?: number; color?: string }) {
  return (
    <svg className="doodle" width={size} height={size} viewBox="0 0 12 12">
      <circle cx={6} cy={6} r={5} fill={color} />
    </svg>
  );
}

export { INK };

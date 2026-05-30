"use client";

import { useState } from "react";
import { CheckDoodle, Dot } from "@/components/doodles";

/* ============================================================
   UI primitives — pastel/doodle design system
   ============================================================ */

type BtnVariant = "dark" | "ghost" | "paper";
type BtnSize = "" | "btn-sm" | "btn-lg";

export function Btn({
  variant = "dark",
  size = "",
  loading = false,
  children,
  className = "",
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`btn btn-${variant} ${size} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        width: 13,
        height: 13,
        border: "2.5px solid currentColor",
        borderTopColor: "transparent",
        borderRadius: "50%",
        opacity: 0.85,
      }}
      className="spin-fast"
    />
  );
}

/* segmented control */
export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.id}
          className={value === o.id ? "on" : ""}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* copy-to-clipboard chip */
export function CopyBtn({ text, label, className = "" }: { text: string; label?: string; className?: string }) {
  const [hit, setHit] = useState(false);
  const copy = () => {
    try {
      navigator.clipboard?.writeText(text);
    } catch {
      /* ignore */
    }
    setHit(true);
    setTimeout(() => setHit(false), 1100);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={"chip " + className}
      style={{
        cursor: "pointer",
        border: "1px solid var(--line)",
        background: hit ? "var(--mint-deep)" : "rgba(26,23,20,0.06)",
      }}
    >
      <span style={{ display: "inline-flex", width: 13 }}>
        {hit ? <CheckDoodle size={13} /> : <CopyGlyph />}
      </span>
      {label || (hit ? "Copied" : "Copy")}
    </button>
  );
}

function CopyGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="5" y="5" width="8" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2H4A1.5 1.5 0 0 0 2.5 3.5V11" />
    </svg>
  );
}

/* truncated mono address with copy */
export function Addr({ value, chars = 6, copy = true }: { value: string; chars?: number; copy?: boolean }) {
  const short = value.length > chars * 2 + 3 ? `${value.slice(0, chars)}…${value.slice(-chars)}` : value;
  const [hit, setHit] = useState(false);
  return (
    <span className="chip" title={value} style={{ gap: 8 }}>
      <span className="mono">{short}</span>
      {copy && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            try {
              navigator.clipboard?.writeText(value);
            } catch {
              /* ignore */
            }
            setHit(true);
            setTimeout(() => setHit(false), 1000);
          }}
          style={{ cursor: "pointer", display: "inline-flex", opacity: hit ? 1 : 0.5 }}
        >
          {hit ? <CheckDoodle size={13} /> : <CopyGlyph />}
        </span>
      )}
    </span>
  );
}

/* code block with mini syntax highlight + copy */
export function CodeBlock({
  lang = "ts",
  code,
  lines,
}: {
  lang?: string;
  code?: string;
  lines?: string[];
}) {
  const text = typeof code === "string" ? code : (lines || []).join("\n");
  return (
    <div className="code">
      <div className="code-head">
        <span className="code-dots">
          <i style={{ background: "#F7B6AE" }} />
          <i style={{ background: "#F2D9A8" }} />
          <i style={{ background: "#C7E08B" }} />
        </span>
        <span className="code-lang">{lang}</span>
        <CopyInline text={text} />
      </div>
      <pre>
        <code>
          {code ? (
            <Highlight src={code} />
          ) : (
            (lines || []).map((l, i) => (
              <div key={i}>{l ? <Highlight src={l} /> : " "}</div>
            ))
          )}
        </code>
      </pre>
    </div>
  );
}

function CopyInline({ text }: { text: string }) {
  const [hit, setHit] = useState(false);
  return (
    <button
      onClick={() => {
        try {
          navigator.clipboard?.writeText(text);
        } catch {
          /* ignore */
        }
        setHit(true);
        setTimeout(() => setHit(false), 1100);
      }}
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "none",
        color: hit ? "#C7E08B" : "#cfc8bf",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        padding: "5px 10px",
        borderRadius: 7,
        cursor: "pointer",
        display: "inline-flex",
        gap: 6,
        alignItems: "center",
      }}
    >
      {hit ? "copied ✓" : "copy"}
    </button>
  );
}

function Highlight({ src }: { src: string }) {
  const rules: [RegExp, string][] = [
    [/(\/\/[^\n]*)/g, "tok-com"],
    [/("[^"]*"|'[^']*'|`[^`]*`)/g, "tok-str"],
    [/\b(import|from|const|let|await|async|return|new|export|function|type|interface)\b/g, "tok-key"],
    [/(\.[a-zA-Z_]\w*)\s*(?=\()/g, "tok-fn"],
    [/([{}()[\];,.:])/g, "tok-pun"],
  ];
  let parts: { t: string; cls: string | null }[] = [{ t: src, cls: null }];
  rules.forEach(([re, cls]) => {
    const next: { t: string; cls: string | null }[] = [];
    parts.forEach((p) => {
      if (p.cls) {
        next.push(p);
        return;
      }
      let last = 0;
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(p.t))) {
        if (m.index > last) next.push({ t: p.t.slice(last, m.index), cls: null });
        next.push({ t: m[0], cls });
        last = m.index + m[0].length;
        if (m[0].length === 0) re.lastIndex++;
      }
      if (last < p.t.length) next.push({ t: p.t.slice(last), cls: null });
    });
    parts = next;
  });
  return (
    <>
      {parts.map((p, i) =>
        p.cls ? (
          <span key={i} className={p.cls}>
            {p.t}
          </span>
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </>
  );
}

/* labelled record-row input */
export function RecordRow({
  icon,
  k,
  value,
  mono = true,
  onChange,
  placeholder,
  locked,
}: {
  icon?: React.ReactNode;
  k: string;
  value: string;
  mono?: boolean;
  onChange?: (v: string) => void;
  placeholder?: string;
  locked?: boolean;
}) {
  return (
    <div className="row gap-12" style={{ alignItems: "center" }}>
      <div style={{ width: 28, display: "flex", justifyContent: "center", color: "var(--ink-soft)" }}>
        {icon}
      </div>
      <div style={{ width: 92, fontWeight: 700, fontSize: 14 }}>{k}</div>
      <input
        className="input-line"
        value={value}
        placeholder={placeholder}
        disabled={locked}
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
          flex: 1,
          opacity: locked ? 0.6 : 1,
        }}
        onChange={(e) => onChange && onChange(e.target.value)}
      />
    </div>
  );
}

/* small section eyebrow with a doodle dot */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="row gap-8" style={{ alignItems: "center" }}>
      <Dot size={9} />
      <span className="eyebrow">{children}</span>
    </div>
  );
}

/* toast */
export function useToast() {
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);
  const show = (msg: string) => {
    setToast({ msg, id: Date.now() });
    setTimeout(() => setToast(null), 2600);
  };
  const node = toast ? (
    <div
      className="pop-in"
      style={{
        position: "fixed",
        bottom: 26,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        background: "var(--ink)",
        color: "var(--paper)",
        padding: "13px 20px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 14,
        boxShadow: "var(--shadow-pop)",
        display: "flex",
        gap: 10,
        alignItems: "center",
      }}
    >
      <CheckDoodle size={16} color="#C7E08B" /> {toast.msg}
    </div>
  ) : null;
  return [node, show] as const;
}

/* key-value pair for read-only rows */
export function KV({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow" style={{ fontSize: 10.5, marginBottom: 5 }}>
        {k}
      </div>
      {children}
    </div>
  );
}

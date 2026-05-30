"use client";

import { useState } from "react";

/* ── Button ──────────────────────────────────────────────────────────── */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  loading?: boolean;
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-[background-color,color,box-shadow,opacity] duration-150 disabled:cursor-not-allowed disabled:opacity-45";
  const styles =
    variant === "primary"
      ? "bg-accent text-on-accent shadow-glow hover:bg-accent-strong active:translate-y-px"
      : "border border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-surface-2 hover:text-ink";
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${base} ${styles} ${className}`}
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
      className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-70"
    />
  );
}

/* ── Text input ──────────────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </span>
      {children}
      {hint && <span className="mt-2 block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-panel px-3.5 py-3 font-mono text-sm text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint/70 focus:border-accent";

/* ── Copy-to-clipboard ───────────────────────────────────────────────── */

export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard blocked; no-op */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-faint transition-colors duration-150 hover:bg-inset hover:text-ink"
      aria-label={copied ? "Copied" : label}
    >
      {copied ? (
        <>
          <CheckIcon /> Copied
        </>
      ) : (
        <>
          <CopyIcon /> {label}
        </>
      )}
    </button>
  );
}

/* ── Code block (light, copy in corner) ──────────────────────────────── */

export function CodeBlock({
  code,
  lang,
}: {
  code: string;
  lang?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-line bg-inset">
      {lang && (
        <span className="absolute left-3.5 top-2.5 text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint">
          {lang}
        </span>
      )}
      <div className="absolute right-2 top-2">
        <CopyButton value={code} />
      </div>
      <pre className={`overflow-x-auto px-4 ${lang ? "pb-4 pt-9" : "py-4"}`}>
        <code className="font-mono text-[0.82rem] leading-relaxed text-ink">
          {code}
        </code>
      </pre>
    </div>
  );
}

/* ── Inline command (single line, e.g. an install command) ───────────── */

export function CommandLine({ command }: { command: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-inset px-4 py-3">
      <code className="overflow-x-auto whitespace-nowrap font-mono text-sm text-ink">
        <span className="select-none text-ink-faint">$ </span>
        {command}
      </code>
      <CopyButton value={command} />
    </div>
  );
}

/* ── Icons (1.25px stroke, matching weight) ──────────────────────────── */

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 15V6a3 3 0 0 1 3-3h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

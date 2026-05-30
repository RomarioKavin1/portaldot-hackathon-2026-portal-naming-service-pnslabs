import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--bg)",
        panel: "var(--surface)",
        inset: "var(--surface-2)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        elevated: "var(--elevated)",
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          faint: "var(--ink-faint)",
        },
        line: {
          DEFAULT: "var(--line)",
          strong: "var(--line-strong)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          strong: "var(--accent-strong)",
          soft: "var(--accent-soft)",
          ink: "var(--accent-ink)",
        },
        "on-accent": "var(--on-accent)",
        ok: {
          DEFAULT: "var(--ok)",
          soft: "var(--ok-soft)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          soft: "var(--danger-soft)",
        },
        warn: "var(--warn)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        panel:
          "inset 0 1px 0 0 oklch(1 0 0 / 0.04), 0 12px 36px -16px oklch(0 0 0 / 0.7)",
        lift:
          "inset 0 1px 0 0 oklch(1 0 0 / 0.05), 0 24px 60px -24px oklch(0 0 0 / 0.8)",
        glow: "0 8px 34px -10px var(--accent-glow)",
        "glow-lg": "0 14px 50px -12px var(--accent-glow)",
      },
      ringColor: {
        accent: "var(--ring)",
      },
    },
  },
  plugins: [],
} satisfies Config;

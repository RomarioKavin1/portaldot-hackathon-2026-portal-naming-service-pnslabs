import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--bg)",
        panel: "var(--panel)",
        inset: "var(--inset)",
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
        danger: {
          DEFAULT: "var(--danger)",
          soft: "var(--danger-soft)",
        },
        warn: {
          DEFAULT: "var(--warn)",
          soft: "var(--warn-soft)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        panel:
          "0 1px 2px oklch(0.3 0.02 70 / 0.04), 0 8px 24px -12px oklch(0.3 0.02 70 / 0.12)",
        lift: "0 2px 4px oklch(0.3 0.02 70 / 0.06), 0 16px 40px -16px oklch(0.3 0.02 70 / 0.18)",
      },
      ringColor: {
        accent: "var(--ring)",
      },
    },
  },
  plugins: [],
} satisfies Config;

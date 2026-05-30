import type { Config } from "tailwindcss";

/**
 * Tailwind is kept minimal — the design lives in app/globals.css.
 * Only utility layout helpers are needed from Tailwind here.
 */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;

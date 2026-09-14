import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary blue — the only colour that means "act": buttons and links.
        // 600 carries white button text at 5.17:1, clear of the AA minimum.
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#1d6ad4",
          700: "#17539f",
          800: "#154277",
          900: "#132f52",
          950: "#0b1c32",
        },
        // Cool neutrals. Named `sand` because every class in the app already
        // says sand-*; the values are now slate so black/white/blue reads
        // crisp instead of muddy.
        sand: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        // Amber — blue's complement, used sparingly for merchandising badges
        // and highlight figures. Never for actions; blue owns those.
        accent: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f0a020",
          600: "#c97e12",
          700: "#9a5f0e",
          800: "#7a4b0d",
          900: "#5c380a",
        },
        // Dark surface — hero, nav, callout sections
        ink: {
          DEFAULT: "#0a0a0a",
          soft:    "#141414",
          muted:   "#262626",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains-mono)", "Menlo", "monospace"],
      },
      fontSize: {
        // Mono data labels. In rem, not px, so it scales with the larger root
        // size we set on small screens.
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      letterSpacing: {
        widest2: "0.2em",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}

export default config

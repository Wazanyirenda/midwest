import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary green — single accent, used sparingly
        brand: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        // Warm neutrals — primary UI palette
        sand: {
          50:  "#fafaf7",
          100: "#f5f4f0",
          200: "#ebe9e3",
          300: "#d9d6cd",
          400: "#b8b4a8",
          500: "#8f8b7f",
          600: "#6b6760",
          700: "#514e48",
          800: "#35332f",
          900: "#1c1b18",
        },
        // Dark surface — hero, nav, callout sections
        ink: {
          DEFAULT: "#0d0d0d",
          soft:    "#1a1a1a",
          muted:   "#2e2e2e",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "Menlo", "monospace"],
      },
      letterSpacing: {
        widest2: "0.2em",
      },
    },
  },
  plugins: [],
}

export default config

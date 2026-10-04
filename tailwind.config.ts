import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core university brand palette (sampled from the certificate template)
        navy: {
          50: "#eef2fa",
          100: "#d6e0f2",
          200: "#adc1e5",
          300: "#7d9bd4",
          400: "#4c6fb8",
          500: "#294a94",
          600: "#1a3576",
          700: "#12285e",
          800: "#0b1c47",
          900: "#071433",
          950: "#020a1c",
        },
        gold: {
          50: "#fbf6e9",
          100: "#f5e8c2",
          200: "#ecd48c",
          300: "#e0ba54",
          400: "#d3a334",
          500: "#b8862a",
          600: "#966a21",
          700: "#734f19",
          800: "#513711",
          900: "#33220a",
        },
      },
      fontFamily: {
        // Premium system-font stacks — no external font fetching required.
        display: [
          "Georgia",
          "'Times New Roman'",
          "ui-serif",
          "serif",
        ],
        sans: [
          "'Segoe UI'",
          "system-ui",
          "-apple-system",
          "Inter",
          "Roboto",
          "sans-serif",
        ],
      },
      // NOTE: the hero background is defined as a single merged rule in
      // globals.css (`.hero-bg`) rather than here, specifically to avoid
      // two different `background-image` utilities competing on the same
      // element. See the comment above `.hero-bg` in globals.css.
      boxShadow: {
        card: "0 20px 60px -15px rgba(7, 20, 51, 0.45)",
        gold: "0 0 0 1px rgba(211,163,52,0.35), 0 8px 24px -8px rgba(211,163,52,0.35)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-500px 0" },
          "100%": { backgroundPosition: "500px 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.6s ease-out both",
        "scale-in": "scale-in 0.35s ease-out both",
        shimmer: "shimmer 2s infinite linear",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

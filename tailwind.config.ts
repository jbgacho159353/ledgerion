import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0e1a",
          soft: "#0d1220",
          card: "#0f1524",
        },
        border: {
          DEFAULT: "rgba(148, 163, 184, 0.12)",
        },
        win: {
          DEFAULT: "#22c55e",
          soft: "rgba(34, 197, 94, 0.15)",
        },
        loss: {
          DEFAULT: "#ef4444",
          soft: "rgba(239, 68, 68, 0.15)",
        },
        neutral: {
          DEFAULT: "#3b82f6",
          soft: "rgba(59, 130, 246, 0.15)",
        },
        gold: {
          DEFAULT: "#eab308",
          soft: "rgba(234, 179, 8, 0.15)",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
export default config;

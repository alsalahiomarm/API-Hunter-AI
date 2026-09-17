import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // خلفيات داكنة مريحة
        night: {
          950: "#070b14",
          900: "#0a1019",
          850: "#0d1524",
          800: "#111b2e",
          700: "#1a2740",
        },
        primary: {
          DEFAULT: "#22d3ee",
          500: "#22d3ee",
          400: "#37daf5",
        },
        accent: {
          DEFAULT: "#a78bfa",
          500: "#a78bfa",
        },
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#f87171",
      },
      fontFamily: {
        sans: [
          "Tajawal",
          "Cairo",
          "IBM Plex Sans Arabic",
          "Segoe UI",
          "Tahoma",
          "system-ui",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px -12px rgba(34,211,238,0.45)",
      },
      animation: {
        "fade-up": "fadeUp .5s ease-out both",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

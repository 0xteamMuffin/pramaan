import type { Config } from "tailwindcss";

/**
 * Colours are driven by CSS variables (RGB channel triplets) declared in
 * styles/globals.css. Wrapping them as rgb(var(--x) / <alpha-value>) lets the
 * accessibility toolbar (dark / high-contrast) retheme the whole app while
 * keeping full Tailwind opacity-modifier support. Components never hard-code hex.
 */
const withAlpha = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: withAlpha("--primary"),
          dark: withAlpha("--primary-dark"),
          darker: withAlpha("--primary-darker"),
          light: withAlpha("--primary-light"),
          50: withAlpha("--primary-50"),
        },
        secondary: {
          DEFAULT: withAlpha("--secondary"),
          dark: withAlpha("--secondary-dark"),
          50: withAlpha("--secondary-50"),
        },
        "accent-teal": withAlpha("--accent-teal"),
        success: {
          DEFAULT: withAlpha("--success"),
          bg: withAlpha("--success-bg"),
        },
        warning: {
          DEFAULT: withAlpha("--warning"),
          bg: withAlpha("--warning-bg"),
        },
        danger: {
          DEFAULT: withAlpha("--danger"),
          bg: withAlpha("--danger-bg"),
        },
        info: {
          DEFAULT: withAlpha("--info"),
          bg: withAlpha("--info-bg"),
        },
        ink: {
          900: withAlpha("--ink-900"),
          700: withAlpha("--ink-700"),
          500: withAlpha("--ink-500"),
        },
        border: withAlpha("--border"),
        surface: {
          DEFAULT: withAlpha("--white"),
          1: withAlpha("--surface-1"),
          2: withAlpha("--surface-2"),
        },
        rag: {
          low: withAlpha("--rag-low"),
          medium: withAlpha("--rag-medium"),
          high: withAlpha("--rag-high"),
          track: withAlpha("--rag-track"),
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Roboto", "Segoe UI", "system-ui", "sans-serif"],
        indic: ["var(--font-mukta)", "var(--font-inter)", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        card: "12px",
        input: "8px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.06)",
        popover: "0 4px 12px rgba(15,23,42,.10)",
        "card-hover": "0 4px 16px rgba(15,23,42,.10)",
      },
      maxWidth: {
        content: "1360px",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        "fade-in": "fade-in .24s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

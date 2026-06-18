import type { Config } from "tailwindcss";

// Design tokens ported from design/login.html (inline tailwind.config in <script>)
// and design/assets/probot.css. Stage 1 surfaces all reuse these tokens.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "oklch(0.55 0.193 251.78)",
        "brand-light": "oklch(0.62 0.17 248)",
        "brand-deep": "oklch(0.40 0.13 258)",
        ink: "oklch(0.19 0.02 261)",
        muted: "oklch(0.46 0.02 262)",
        "bg-app": "oklch(0.985 0.004 264)",
        "border-base": "oklch(0.90 0.008 264)",
        success: "oklch(0.62 0.16 150)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

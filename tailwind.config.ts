import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-noto)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#1A1A1A",
          foreground: "#FFFFFF",
        },
        page: "#FAF8F5",
        surface: "#FFFFFF",
        ink: "#2D2A26",
        muted: "#8A8580",
        border: "#E8E4DF",
      },
      boxShadow: {
        card: "0 1px 3px rgba(45, 42, 38, 0.06), 0 4px 12px rgba(45, 42, 38, 0.04)",
        "card-hover": "0 4px 16px rgba(45, 42, 38, 0.1)",
        header: "0 1px 0 rgba(45, 42, 38, 0.06)",
      },
    },
  },
  plugins: [],
} satisfies Config;

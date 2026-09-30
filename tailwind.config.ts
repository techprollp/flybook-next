import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#e91e8c",
          blue: "#2563eb",
          soft: "#ff6b9d",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f8f9fb",
          border: "#eef0f4",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06)",
        card: "0 1px 3px rgba(16,24,40,.04), 0 12px 32px rgba(16,24,40,.06)",
        modal: "0 24px 64px rgba(16,24,40,.14)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;

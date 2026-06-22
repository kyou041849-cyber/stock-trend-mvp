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
        ink: "#17202a",
        line: "#d7dde5",
        surface: "#f7f9fb",
        accent: "#0f766e",
        caution: "#b7791f",
        decline: "#be123c",
        primary: {
          DEFAULT: "#0f766e",
          foreground: "#ffffff",
          subtle: "#f0fdfa",
        },
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#64748b",
        },
        success: {
          DEFAULT: "#047857",
          subtle: "#ecfdf5",
        },
        warning: {
          DEFAULT: "#b7791f",
          subtle: "#fffbeb",
        },
        danger: {
          DEFAULT: "#be123c",
          subtle: "#fff1f2",
        },
        info: {
          DEFAULT: "#0369a1",
          subtle: "#f0f9ff",
        },
      },
      borderRadius: {
        card: "0.5rem",
        control: "0.375rem",
      },
      boxShadow: {
        panel: "0 14px 35px rgba(24, 35, 51, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

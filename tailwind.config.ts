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
        sil: {
          bg: "#0a0e13",
          surface: "#111820",
          card: "#161f2a",
          border: "#1e2d3d",
          accent: "#00d4ff",
          "accent-dim": "#0099bb",
          green: "#00ff88",
          yellow: "#ffaa00",
          red: "#ff3333",
          text: "#c8d8e8",
          muted: "#5a7a9a",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

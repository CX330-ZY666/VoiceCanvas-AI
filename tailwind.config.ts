import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          paper: "#ffffff",
          wash: "#f6f7f9",
          ink: "#20242a",
          muted: "#68707c",
          line: "#d8dde5",
          accent: "#1f8a70"
        }
      },
      boxShadow: {
        panel: "0 18px 44px -26px rgba(32, 36, 42, 0.28)"
      }
    }
  },
  plugins: []
};

export default config;

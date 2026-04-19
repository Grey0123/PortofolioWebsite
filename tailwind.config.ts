import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Keep the original palette so we can echo the old look where we want to.
        ink: "#080808",
        card: "#262626",
        muted: "#ababab",
        accent: "#ff004f",
        cyanGlow: "#00b7ff",
        magentaGlow: "#ff30ff",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        rotBGimg: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rotBGimg: "rotBGimg 3s linear infinite",
        fadeInUp: "fadeInUp 0.8s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;

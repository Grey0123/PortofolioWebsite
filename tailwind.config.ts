import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep-space palette. ONE saturated accent (#ff004f); everything else
        // is cool, desaturated "atmosphere" so the accent actually pops.
        // Why: when pink, cyan, AND magenta all glow at full saturation,
        // nothing is emphasized — it reads as a template. A single accent
        // over indigo-black reads as a deliberate design decision.
        ink: "#06070f",   // near-black with a blue-violet cast (space, not soot)
        card: "#12141f",  // card surface, same hue family as ink
        muted: "#a3a7bd", // cool gray for body text (was neutral #ababab)
        accent: "#ff004f",
        // NOTE: keys kept so existing `via-magentaGlow` / `to-cyanGlow`
        // classes don't break, but the VALUES are now soft cosmic tints —
        // rose + periwinkle — instead of saturated neon.
        cyanGlow: "#a5a8ff",
        magentaGlow: "#ff5e86",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Headings: Space Grotesk — geometric, slightly technical, and (fittingly)
        // designed for a space-y look. Distinct from Poppins-everywhere, which is
        // the default look of a thousand generated portfolios.
        display: ["var(--font-grotesk)", "var(--font-poppins)", "sans-serif"],
        // Overriding Tailwind's DEFAULT mono/serif stacks rather than adding
        // new keys, so every existing `font-mono` / `font-serif` class picks
        // these up with no find-and-replace. The system fallbacks stay in the
        // list — if next/font ever fails to load, text degrades to the OS
        // monospace instead of to a proportional sans, which would break the
        // digit alignment these are here for.
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
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
        // The project-page hero glow. A slow drift + scale so the wash
        // breathes instead of sitting as a static blob.
        //
        // Only `transform` animates — deliberately. Transform and opacity are
        // the two properties a browser can animate on the compositor, without
        // recalculating layout or repainting. Animating `width`/`left` here
        // would look identical and force a layout pass every frame on an
        // element that is 110px-blurred and enormous — the most expensive
        // thing on the page to repaint.
        auroraDrift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(8%, 6%) scale(1.12)" },
        },
      },
      animation: {
        rotBGimg: "rotBGimg 3s linear infinite",
        fadeInUp: "fadeInUp 0.8s ease-out forwards",
        auroraDrift: "auroraDrift 22s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

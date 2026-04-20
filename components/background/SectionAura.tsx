// SectionAura — a tiny decorative "color wash" meant to live inside a
// non-hero section and echo the hero's aurora palette.
//
// Why it exists:
//   The global <PageBackground/> already gives every section a shared
//   starfield + nebula atmosphere. But because its nebulas are `fixed`,
//   scrolling past multiple sections can feel monotone (same stars, same
//   blobs). Each section drops in a <SectionAura/> with a unique color +
//   position — a one-off flavour note that anchors the section visually
//   without breaking the "single universe" feel of the site.
//
// Usage: drop it as the first child inside a `relative` section.
//
//   <section className="relative px-6 py-24 md:px-[10%]">
//     <SectionAura color="cyan" position="top-right" />
//     ...
//   </section>

import type { CSSProperties } from "react";

type Color = "pink" | "cyan" | "magenta" | "amber";
type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center-left"
  | "center-right";

const COLORS: Record<Color, string> = {
  pink: "#ff004f",
  cyan: "#00b7ff",
  magenta: "#ff30ff",
  amber: "#f89820",
};

// Map each position to % offsets. Top/bottom use 0/auto; left/right likewise.
const POSITION_STYLES: Record<Position, CSSProperties> = {
  "top-left":      { top: "-10%",  left: "-10%"  },
  "top-right":     { top: "-10%",  right: "-10%" },
  "bottom-left":   { bottom: "-10%", left: "-10%" },
  "bottom-right":  { bottom: "-10%", right: "-10%" },
  "center-left":   { top: "30%",   left: "-20%"  },
  "center-right":  { top: "30%",   right: "-20%" },
};

export default function SectionAura({
  color = "pink",
  position = "top-right",
  opacity = 0.18,
  size = "40%",
}: {
  color?: Color;
  position?: Position;
  opacity?: number;
  size?: string;
}) {
  const hex = COLORS[color];
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -z-[1] rounded-full blur-3xl"
      style={{
        ...POSITION_STYLES[position],
        width: size,
        height: size,
        opacity,
        background: `radial-gradient(circle, ${hex} 0%, transparent 65%)`,
      }}
    />
  );
}

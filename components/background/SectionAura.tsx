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
// Usage: drop it as the first child inside a `relative` section whose
// HORIZONTAL overflow is clipped but whose VERTICAL overflow is NOT — i.e.
// `overflow-x-clip`, never `overflow-hidden`.
//
//   Why this matters: the aura is intentionally oversized and offset off
//   the section's edges. If the section clips vertically (overflow-hidden),
//   the soft blurred blob is sliced flat at the boundary, turning a gentle
//   glow into a hard horizontal line — that's the visible "seam" between
//   sections. `overflow-x-clip` lets the blob's soft edges bleed into the
//   neighbouring sections and blend (seamless), while still preventing the
//   off-screen width from spawning a horizontal scrollbar.
//
//   <section className="relative overflow-x-clip px-6 py-24 md:px-[10%]">
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

// Deep-space remap. The KEYS are kept so existing call sites don't break,
// but every non-accent value is now a cool, desaturated space tone. Rule of
// the theme: pink (#ff004f) is the only saturated color on the page — the
// others must read as "different shades of night sky", not competing neons.
const COLORS: Record<Color, string> = {
  pink: "#ff004f",    // the accent — use sparingly
  cyan: "#4a55b8",    // cool indigo (was neon cyan)
  magenta: "#6b56c4", // muted violet (was neon magenta)
  amber: "#7c6aa8",   // dusty lavender (was orange — warm tones fight the theme)
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

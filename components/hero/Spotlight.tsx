"use client";
// Client Component — tracks mouse position to power the cursor-follow glow.

import { useEffect, useRef } from "react";

export default function Spotlight() {
  // `useRef` gives us a stable reference to a DOM node without triggering
  // re-renders when it changes. Perfect for performance-sensitive stuff like
  // cursor tracking where we update a CSS variable, not React state.
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // requestAnimationFrame batches CSS updates with the browser's paint
    // cycle, so we never update faster than the screen refreshes.
    let frame = 0;
    let x = 0;
    let y = 0;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;

      if (!frame) {
        frame = requestAnimationFrame(() => {
          el.style.setProperty("--mx", `${x}px`);
          el.style.setProperty("--my", `${y}px`);
          frame = 0;
        });
      }
    };

    el.addEventListener("mousemove", onMove);
    return () => {
      el.removeEventListener("mousemove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      // The glow is a radial-gradient centered on CSS variables we update.
      // opacity-0 group-hover:opacity-100 means it only shows when the hero
      // area is hovered, so mobile users (no mouse) never see a dead glow.
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      style={{
        background:
          "radial-gradient(500px circle at var(--mx, 50%) var(--my, 50%), rgba(255, 0, 79, 0.18), transparent 60%)",
      }}
    />
  );
}

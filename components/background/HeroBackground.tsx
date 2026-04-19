// Server component — no interactivity, just decorative layers.
// The animation here is pure CSS (see globals.css .aurora class) so we don't
// need to ship any JavaScript for it. That's the nice thing about CSS motion:
// no "use client" needed.

export default function HeroBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Solid base so content remains legible if animations fail */}
      <div className="absolute inset-0 bg-ink" />

      {/* Three soft blurred blobs animate in opposite directions, creating an
          "aurora" feel. Each blob is an absolutely-positioned div with a
          radial gradient background. */}
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />

      {/* Subtle dot grid overlay — gives the hero a 'tech / infra' texture. */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_85%)]" />

      {/* Fade the bottom into the page so the next section blends in */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />
    </div>
  );
}

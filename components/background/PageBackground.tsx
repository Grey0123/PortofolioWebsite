// PageBackground — a persistent "deep space" layer that sits behind every
// section of the page. This is what connects the hero to the rest of the
// site: stars and soft nebula washes continue uninterrupted as you scroll.
//
// Intentionally a Server Component — pure decoration, no state, no events,
// so it costs zero client JS.
//
// Layer plan (far → near):
//   1. Solid #070709 base (slightly deeper than #080808 hero ink for contrast).
//   2. Seeded starfield (dimmer + sparser than the hero's — ambience only).
//   3. Three very soft, low-opacity nebula blobs fixed behind the viewport.
//   4. Subtle radial grid texture matching the hero's vibe.
//
// Hero-specific layers (aurora, twinkling bright stars, grid) render ON TOP of
// this inside <HeroBackground/>, so the hero feels like an intensified
// version of the same universe — not a separate block.

const SEED_STARS = (() => {
  // LCG — deterministic for SSR/client parity.
  let seed = 28481;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // We paint in a 100x200 viewBox (2:1 tall) so stars cover long pages
  // without getting vertically stretched when preserveAspectRatio="none".
  const stars: { x: number; y: number; r: number; o: number }[] = [];
  for (let i = 0; i < 180; i++) {
    stars.push({
      x: rand() * 100,
      y: rand() * 200,
      r: rand() * 0.9 + 0.25,
      o: rand() * 0.35 + 0.08, // dim — ambience, not focal
    });
  }
  return stars;
})();

export default function PageBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-20 overflow-hidden"
    >
      {/* 1. Deep base */}
      <div className="absolute inset-0 bg-[#070709]" />

      {/* 2. Starfield — fixed to viewport so stars stay put while content
            scrolls, giving a parallax/star-at-infinity feel. */}
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 200"
      >
        {SEED_STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r * 0.14}
            fill="white"
            opacity={s.o}
          />
        ))}
      </svg>

      {/* 3. Nebula washes — gigantic blurry color blobs anchored at different
            corners. Opacity is dialed way down so they read as "atmosphere"
            rather than graphics. Three different palette notes (pink, cyan,
            magenta) matching the hero + accent palette. */}
      <div
        className="absolute -left-[20%] top-[8%] h-[55vh] w-[55vw] rounded-full opacity-[0.18] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, #ff004f 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute -right-[15%] top-[38%] h-[50vh] w-[50vw] rounded-full opacity-[0.14] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, #00b7ff 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-[5%] left-[20%] h-[55vh] w-[55vw] rounded-full opacity-[0.14] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, #ff30ff 0%, transparent 65%)",
        }}
      />

      {/* 4. Subtle radial grid — mirrors the hero's dotted texture but
            fainter and masked so it vignettes toward the edges. */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_90%)]" />
    </div>
  );
}

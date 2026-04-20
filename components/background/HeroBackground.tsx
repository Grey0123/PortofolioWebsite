// Server component — no interactivity, just decorative layers.
// The animation here is pure CSS (see globals.css .aurora class) so we don't
// need to ship any JavaScript for it. That's the nice thing about CSS motion:
// no "use client" needed.
//
// A seeded starfield is rendered at build time so it matches on SSR + client
// (no hydration flicker). Because the background spans the full hero, stars
// naturally appear behind the orbit hub too — the whole hero feels like space.

const SEED_STARS = (() => {
  // LCG so stars are deterministic across renders.
  let seed = 11311;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Two layers so the field has depth:
  //  - tinyStars: many small dim points
  //  - brightStars: fewer, larger, brighter (a few get a soft twinkle class)
  const tinyStars: { x: number; y: number; r: number; o: number }[] = [];
  for (let i = 0; i < 140; i++) {
    tinyStars.push({
      x: rand() * 100,       // percent
      y: rand() * 100,       // percent
      r: rand() * 1.1 + 0.3, // px
      o: rand() * 0.45 + 0.18,
    });
  }

  const brightStars: {
    x: number;
    y: number;
    r: number;
    o: number;
    twinkle: boolean;
  }[] = [];
  for (let i = 0; i < 36; i++) {
    brightStars.push({
      x: rand() * 100,
      y: rand() * 100,
      r: rand() * 1.6 + 1.0,
      o: rand() * 0.3 + 0.65,
      twinkle: rand() < 0.45,
    });
  }

  return { tinyStars, brightStars };
})();

export default function HeroBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* NOTE: no solid base here anymore — the global <PageBackground/>
          provides the deep-space base, and we layer the hero-only flourishes
          (aurora, bright twinkling stars, grid) on top. This makes the hero
          feel like an "intensified" region of the same universe rather than
          a box with its own background. */}

      {/* Starfield — rendered at the bottom of the stack so it sits BEHIND
          the aurora blobs and the foreground content. Two layers (dim + bright)
          give a subtle parallax feel. */}
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {/* Dim background layer */}
        {SEED_STARS.tinyStars.map((s, i) => (
          <circle
            key={`t-${i}`}
            cx={s.x}
            cy={s.y}
            // The viewBox is 100x100 so r is in vw-ish units — scale up via
            // CSS filter? Simpler: just set r in "viewBox units" with a small
            // value. Looks right at all sizes because we `preserveAspectRatio="none"`.
            r={s.r * 0.12}
            fill="white"
            opacity={s.o}
          />
        ))}
        {/* Bright layer — some have the twinkle animation. */}
        {SEED_STARS.brightStars.map((s, i) => (
          <circle
            key={`b-${i}`}
            cx={s.x}
            cy={s.y}
            r={s.r * 0.14}
            fill="white"
            opacity={s.o}
            className={s.twinkle ? "hero-star-twinkle" : undefined}
            style={s.twinkle ? { animationDelay: `${(i % 7) * 0.6}s` } : undefined}
          />
        ))}
      </svg>

      {/* Three soft blurred blobs animate in opposite directions, creating an
          "aurora" feel. Each blob is an absolutely-positioned div with a
          radial gradient background. Sits ABOVE the stars so colors blend
          over them. */}
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />

      {/* Subtle dot grid overlay — gives the hero a 'tech / infra' texture. */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_85%)]" />

      {/* Soft fade at the bottom — not to solid ink anymore (that would hide
          the page-global stars below) but to transparent with a nudge of
          darker tint, so the hero's vivid aurora tapers into the calm
          ambient star field continuing down the page. */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#07070922]" />
    </div>
  );
}

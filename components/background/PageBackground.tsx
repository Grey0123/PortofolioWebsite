// PageBackground — a persistent "deep space" layer that sits behind every
// section of the page. This is what connects the hero to the rest of the
// site: stars and soft nebula washes continue uninterrupted as you scroll.
//
// Intentionally a Server Component — pure decoration, no state, no events,
// so it costs zero client JS.
//
// Layer plan (far → near):
//   1. Solid indigo-black base (#05060c) — space has a blue-violet cast,
//      not a neutral gray one. This tiny hue shift is most of the "space"
//      feel; the stars just confirm it.
//   2. A faint diagonal "milky way" band — a barely-there brightness ridge
//      that gives the sky a structure real starfields have. At 4% opacity
//      you feel it more than see it.
//   3. Seeded starfield. Most stars are white; roughly one in five is
//      tinted pale blue (#c7d2ff) because real stars aren't all one color —
//      uniformity is what makes generated starfields look fake. A handful
//      slowly twinkle.
//   4. Two cool nebula washes (indigo, violet) + ONE accent nebula (pink).
//      The accent is the only saturated color allowed back here — the old
//      pink/cyan/magenta trio is what made the page read "neon template".
//
// The dotted grid overlay that used to sit on top is gone: graph paper
// says "tech dashboard", open sky says "space". The hero keeps a fainter
// grid of its own for texture where the content density can carry it.

const SEED_STARS = (() => {
  // LCG — deterministic for SSR/client parity.
  let seed = 28481;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // We paint in a 100x200 viewBox (2:1 tall) so stars cover long pages
  // without getting vertically stretched when preserveAspectRatio="none".
  const stars: {
    x: number;
    y: number;
    r: number;
    o: number;
    tint: boolean;    // pale-blue star instead of white
    twinkle: boolean; // slow opacity pulse
  }[] = [];
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: rand() * 100,
      y: rand() * 200,
      r: rand() * 0.9 + 0.25,
      o: rand() * 0.35 + 0.08, // dim — ambience, not focal
      tint: rand() < 0.22,
      twinkle: rand() < 0.08, // only ~1 in 12 — subtle life, not a disco
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
      {/* 1. Deep space base */}
      <div className="absolute inset-0 bg-[#05060c]" />

      {/* 2. Milky-way band — huge, rotated, heavily blurred brightness ridge.
            The gradient runs across the band's width so it fades in and out. */}
      <div
        className="absolute left-1/2 top-1/2 h-[150vh] w-[70vw] -translate-x-1/2 -translate-y-1/2 rotate-[24deg] opacity-[0.05] blur-3xl"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #aab4ff 42%, #ffffff 55%, transparent 100%)",
        }}
      />

      {/* 3. Starfield — fixed to viewport so stars stay put while content
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
            fill={s.tint ? "#c7d2ff" : "white"}
            opacity={s.o}
            className={s.twinkle ? "star-twinkle" : undefined}
            style={
              s.twinkle ? { animationDelay: `${(i % 9) * 0.7}s` } : undefined
            }
          />
        ))}
      </svg>

      {/* 4. Nebula washes. Cool indigo + violet carry the atmosphere;
            a single low-opacity pink blob ties the sky to the accent.
            Opacities are deliberately lower than before — nebulas should
            be something you notice on the second look, not the first. */}
      <div
        className="absolute -left-[20%] top-[8%] h-[55vh] w-[55vw] rounded-full opacity-[0.10] blur-3xl"
        style={{
          background: "radial-gradient(circle, #ff004f 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute -right-[15%] top-[38%] h-[50vh] w-[50vw] rounded-full opacity-[0.14] blur-3xl"
        style={{
          background: "radial-gradient(circle, #3d478f 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-[5%] left-[20%] h-[55vh] w-[55vw] rounded-full opacity-[0.12] blur-3xl"
        style={{
          background: "radial-gradient(circle, #5b4a9e 0%, transparent 65%)",
        }}
      />
    </div>
  );
}

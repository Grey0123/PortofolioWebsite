// TwinkleField — small twinkling glow lights distributed across the WHOLE
// document, not the viewport. Because this layer is absolutely positioned
// inside <main> (which spans the full page height), the lights belong to
// the sections they sit in and scroll away with them — unlike the fixed
// <PageBackground/>, which stays put behind the viewport.
//
// "Distant" is the design goal: tiny cores (4–13px glow diameter), low
// opacity, no big halos. They should register as far-away stars catching
// the eye, never as nearby lamps.
//
// Server Component — deterministic seeded positions (SSR/client parity),
// zero JS shipped; the twinkle is the shared .star-twinkle CSS animation
// with per-light delay/duration so pulses never synchronise.

const SEED_LIGHTS = (() => {
  // LCG — same deterministic pattern as the other background layers.
  let seed = 71209;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const lights: {
    left: number; // % of page width
    top: number; // % of full DOCUMENT height
    size: number; // px — glow diameter (kept small = reads distant)
    warm: boolean;
    delay: number; // s
    dur: number; // s
    o: number; // base opacity
  }[] = [];
  // The page is ~6–7 viewports tall, so distribute generously over the
  // full height — each section ends up with a handful of lights.
  for (let i = 0; i < 72; i++) {
    lights.push({
      left: rand() * 100,
      top: rand() * 100,
      size: 4 + rand() * 9,
      warm: rand() < 0.3,
      delay: rand() * 7,
      dur: 5 + rand() * 6,
      o: 0.2 + rand() * 0.3,
    });
  }
  return lights;
})();

export default function TwinkleField() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {SEED_LIGHTS.map((sp, i) => (
        // Outer div carries the per-light base brightness; the inner div
        // runs the twinkle (its keyframes animate `opacity`, which would
        // override a base opacity set on the same element).
        <div
          key={i}
          className="absolute"
          style={{
            left: `${sp.left}%`,
            top: `${sp.top}%`,
            width: sp.size,
            height: sp.size,
            opacity: sp.o,
          }}
        >
          <div
            className="star-twinkle h-full w-full rounded-full"
            style={{
              background: `radial-gradient(circle, ${
                sp.warm ? "rgba(255,225,160,0.95)" : "rgba(219,228,255,0.95)"
              } 0%, transparent 65%)`,
              animationDelay: `${sp.delay}s`,
              animationDuration: `${sp.dur}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

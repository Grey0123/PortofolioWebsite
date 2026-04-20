// Server Component wrapper. The interactive bits (Navbar, RotatingRole,
// Spotlight, OrbitSystem) are their own Client Components, which lets
// Next.js keep this shell on the server and ship less JS for the static parts.
//
// Layout goal: on md+ screens, the hero text and the interactive orbit hub
// sit side-by-side in a 2-column grid. On mobile they stack (text on top,
// orbit below). Padding is increased so neither column feels cramped.

import Navbar from "./Navbar";
import HeroBackground from "./background/HeroBackground";
import RotatingRole from "./hero/RotatingRole";
import Spotlight from "./hero/Spotlight";
import StatsStrip from "./StatsStrip";
import { OrbitSystem } from "./TechMarquee";

export default function Header() {
  return (
    <section
      id="home"
      // `group` enables `group-hover:` utilities on children — Spotlight uses it.
      // Generous bottom padding so the hero reads comfortably when the orbit
      // sits beside the text.
      className="group relative w-full overflow-hidden pb-20 md:pb-28"
    >
      <HeroBackground />
      <Spotlight />

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col px-6 md:px-[10%]">
        <Navbar />

        {/* Two-column hero:
            - Left: name, rotating role, CTAs.
            - Right: OrbitSystem (the interactive 3D services hub).
            The grid collapses to a single column under `md`. We give the
            left column `md:col-span-7` and the orbit `md:col-span-5` so the
            copy gets a bit more horizontal room than the visualization.
            `gap-12` / `lg:gap-16` gives breathing room between them. */}
        <div className="mt-[14vh] grid grid-cols-1 items-center gap-12 md:mt-[16vh] md:grid-cols-12 lg:gap-16">
          {/* ── LEFT COLUMN ── */}
          <div className="md:col-span-7">
            <p className="text-sm uppercase tracking-[0.35em] text-muted">
              Portfolio · Indonesia
            </p>

            <h1 className="mt-6 text-4xl font-bold leading-[1.1] md:text-5xl lg:text-6xl xl:text-7xl">
              Hi, I&apos;m{" "}
              <span className="gradient-text">Nabil</span>
            </h1>

            {/* Second line: fixed prefix + rotating role */}
            <p className="mt-4 text-2xl font-medium md:text-3xl lg:text-4xl">
              I&apos;m a <RotatingRole />
            </p>

            <p className="mt-6 max-w-xl text-base text-muted md:text-lg">
              I build data-driven solutions and reliable software — from
              analytics dashboards and automated QA pipelines to AI-powered
              apps.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#portfolio"
                className="inline-block rounded-full bg-accent px-8 py-3 font-medium text-white shadow-[0_0_30px_rgba(255,0,79,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(255,0,79,0.55)]"
              >
                View My Work
              </a>
              <a
                href="#contact"
                className="inline-block rounded-full border border-white/20 bg-white/5 px-8 py-3 font-medium text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10"
              >
                Get In Touch
              </a>
            </div>
          </div>

          {/* ── RIGHT COLUMN: interactive orbit hub ──
              Max-width caps the orbit so it never dominates the hero, and
              `mx-auto` centers it in the column on mobile. */}
          <div className="md:col-span-5">
            <div className="relative mx-auto w-full max-w-[520px] md:max-w-none">
              <OrbitSystem />
              {/* Caption sits BELOW the orbit so the widget leads visually. */}
              <p className="mt-4 text-center text-xs uppercase tracking-[0.3em] text-muted">
                <span className="text-accent">●</span> Click the core to
                explore services
              </p>
            </div>
          </div>
        </div>

        {/* Stats strip lives below the two-column hero. */}
        <div className="mt-16 md:mt-20">
          <StatsStrip />
        </div>
      </div>
    </section>
  );
}

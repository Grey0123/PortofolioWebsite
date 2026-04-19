// Server Component wrapper. The interactive bits (Navbar, RotatingRole,
// Spotlight) are their own Client Components, which lets Next.js keep this
// shell on the server and ship less JS.

import Navbar from "./Navbar";
import HeroBackground from "./background/HeroBackground";
import RotatingRole from "./hero/RotatingRole";
import Spotlight from "./hero/Spotlight";
import StatsStrip from "./StatsStrip";

export default function Header() {
  return (
    <section
      id="home"
      // `group` enables `group-hover:` utilities on children — Spotlight uses it.
      // StatsStrip now sits just below the CTA buttons instead of being pushed
      // to the bottom, so no flex-1 trickery here — just natural flow.
      className="group relative w-full overflow-hidden pb-16 md:pb-24"
    >
      <HeroBackground />
      <Spotlight />

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col px-6 md:px-[10%]">
        <Navbar />

        <div className="mt-[15vh] max-w-3xl md:mt-[17vh]">
          <p className="text-sm uppercase tracking-[0.35em] text-muted">
            Portfolio · Indonesia
          </p>

          <h1 className="mt-6 text-4xl font-bold leading-[1.1] md:text-6xl lg:text-7xl">
            Hi, I&apos;m{" "}
            <span className="gradient-text">Nabil</span>
          </h1>

          {/* Second line: fixed prefix + rotating role */}
          <p className="mt-4 text-2xl font-medium md:text-4xl">
            I&apos;m a <RotatingRole />
          </p>

          <p className="mt-6 max-w-xl text-base text-muted md:text-lg">
            I build data-driven solutions and reliable software — from
            analytics dashboards and automated QA pipelines to AI-powered apps.
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

        {/* Small breathing room below the CTA row, then the stats strip. */}
        <div className="mt-16 md:mt-20">
          <StatsStrip />
        </div>
      </div>
    </section>
  );
}

// Server Component wrapper. The interactive bits (Navbar, RotatingRole,
// Spotlight, OrbitSystem) are their own Client Components, which lets
// Next.js keep this shell on the server and ship less JS for the static parts.
//
// Data is fetched once in app/page.tsx and passed down as props so each
// subsection here doesn't have to do its own fetch.

import Navbar from "./Navbar";
import HeroBackground from "./background/HeroBackground";
import RotatingRole from "./hero/RotatingRole";
import Spotlight from "./hero/Spotlight";
import StatsStrip from "./StatsStrip";
import { OrbitSystem } from "./TechMarquee";
import type {
  ApiOrbitService,
  ApiRotatingRole,
  ApiStat,
} from "@/lib/api";

export default function Header({
  rotatingRoles = [],
  stats = [],
  orbitServices = [],
}: {
  rotatingRoles?: ApiRotatingRole[];
  stats?: ApiStat[];
  orbitServices?: ApiOrbitService[];
}) {
  // RotatingRole only needs the labels, not the wrapper objects.
  const roleLabels = rotatingRoles.map((r) => r.label);

  return (
    <section
      id="home"
      className="group relative w-full overflow-hidden pb-20 md:pb-28"
    >
      <HeroBackground />
      <Spotlight />

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col px-6 md:px-[10%]">
        <Navbar />

        <div className="mt-[14vh] grid grid-cols-1 items-center gap-12 md:mt-[16vh] md:grid-cols-12 lg:gap-16">
          <div className="md:col-span-7">
            <p className="text-sm uppercase tracking-[0.35em] text-muted">
              Portfolio · Indonesia
            </p>

            <h1 className="mt-6 text-4xl font-bold leading-[1.1] md:text-5xl lg:text-6xl xl:text-7xl">
              Hi, I&apos;m{" "}
              <span className="gradient-text">Nabil</span>
            </h1>

            <p className="mt-4 text-2xl font-medium md:text-3xl lg:text-4xl">
              I&apos;m a <RotatingRole roles={roleLabels} />
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

          <div className="md:col-span-5">
            <div className="relative mx-auto w-full max-w-[520px] md:max-w-none">
              <OrbitSystem services={orbitServices} />
              <p className="mt-8 text-center text-xs uppercase tracking-[0.3em] text-muted md:mt-10">
                <span className="text-accent">●</span> Click the core to
                explore services
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 md:mt-20">
          <StatsStrip stats={stats} />
        </div>
      </div>
    </section>
  );
}

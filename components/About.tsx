// "About Me" — the first half of the old combined About section.
//
// This used to be a tabbed panel (Skills / Experience / Education) that was a
// Client Component because the tabs needed `useState`. The standalone design
// splits that apart: "About Me" (portrait + bio + skills) is its own section,
// and the timeline moved to <ExperienceEducation/>. With the tabs gone there's
// no interactivity left here, so this is now a plain Server Component — the
// only client island is <CandidCarousel/>, which a Server Component can render
// directly. (Server renders the static shell; the carousel hydrates on its own.)

import SectionAura from "./background/SectionAura";
import CandidCarousel, { type CandidSlide } from "./CandidCarousel";
import type { ApiCandidPhoto, ApiSkill } from "@/lib/api";

// Used only when the API hasn't delivered any candid photos yet (DB not
// seeded, backend down). Once `candid_photos` rows exist in Supabase, the
// real data takes over and this list is ignored.
const FALLBACK_CANDID_SLIDES: CandidSlide[] = [
  { src: "/images/profile.png", alt: "Nabil portrait" },
  {
    src: "/images/candid/candid-1.png",
    alt: "Candid moment of Nabil",
    // 16:9 photo with subject on the left third — pull the crop left so
    // his face stays in the square frame instead of being cropped out.
    position: "30% center",
  },
];

// Adapter: API rows use `image_path` and nullable `position`. Convert into
// the local CandidSlide shape the carousel component already understands.
function toSlides(rows: ApiCandidPhoto[]): CandidSlide[] {
  return rows.map((r) => ({
    src: r.image_path,
    alt: r.alt,
    position: r.position ?? undefined,
  }));
}

// Props provided by the parent server component (app/page.tsx). Note that
// `experience` / `education` are NO LONGER here — they belong to
// <ExperienceEducation/> now.
export default function About({
  skills = [],
  candidPhotos = [],
}: {
  skills?: ApiSkill[];
  candidPhotos?: ApiCandidPhoto[];
}) {
  // Pick API data when present, otherwise the fallback. This keeps the
  // section useful before the gallery tables have been seeded.
  const slides =
    candidPhotos.length > 0 ? toSlides(candidPhotos) : FALLBACK_CANDID_SLIDES;

  return (
    <section id="about" className="relative overflow-x-clip px-6 py-24 md:px-[10%]">
      <SectionAura color="cyan" position="top-left" />
      <SectionAura color="magenta" position="bottom-right" opacity={0.1} />

      {/* Two-column split: portrait (narrower) + copy (wider). The fr ratio
          0.82 / 1.18 matches the standalone — the text column gets the room
          it needs for a comfortable reading measure. Stacks on mobile. */}
      <div className="mx-auto grid max-w-[1180px] gap-12 md:grid-cols-[0.82fr_1.18fr] md:items-center md:gap-[60px]">
        {/* ---------------- LEFT: portrait card ---------------- */}
        <div className="relative">
          {/* Soft gradient "rim light" sitting just behind the card. Blurred
              and low-opacity so it reads as a glow, not a hard border. */}
          <div
            aria-hidden
            className="absolute -inset-[1.5px] rounded-[22px] opacity-50 blur-[3px]"
            style={{
              background:
                "linear-gradient(150deg, #ff004f, transparent 45%, #00b7ff)",
            }}
          />
          <div className="relative overflow-hidden rounded-[20px] border border-white/10">
            <CandidCarousel slides={slides} />

            {/* Overlay info (name / location / availability). pointer-events-none
                so the carousel's own arrows + dots underneath stay clickable. */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 font-mono text-[10.5px] text-[#43b02a] backdrop-blur-sm">
                <span className="h-[7px] w-[7px] rounded-full bg-[#43b02a] shadow-[0_0_8px_#43b02a]" />
                Open to work
              </span>

              <div className="absolute bottom-3 left-4">
                <div className="text-[15px] font-semibold text-white">
                  Nabil A. S. Gaharu
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-white/60">
                  Jakarta, Indonesia
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- RIGHT: bio + skills ---------------- */}
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
            01 / About me
          </p>

          <h2 className="mt-4 text-4xl font-semibold leading-[1.06] tracking-tight md:text-5xl">
            Curious by nature,
            <br />
            {/* Serif italic accent word — the one typographic flourish from the
                standalone. Tailwind's default `font-serif` stack covers it
                without pulling in a new web font. */}
            <span className="font-serif font-normal italic">rigorous</span> by
            habit.
          </h2>

          <p className="mt-6 max-w-[610px] text-[16.5px] leading-relaxed text-muted">
            I&apos;m dedicated to continuous learning and adaptability — known
            for my diligence and ability to pick things up quickly. I thrive
            equally on independent problem-solving and team collaboration,
            always focused on both the craft and the outcome.
          </p>

          <div className="mt-8 h-px bg-white/[0.08]" />

          {/* Skills — name + note, two columns. (The standalone shows a
              percentage bar per skill; that needs a numeric `level` field on
              the skills table, which the data doesn't have yet, so we render
              the honest name + detail instead of inventing numbers.) */}
          <div className="mt-7 grid gap-x-9 gap-y-6 sm:grid-cols-2">
            {skills.map((skill) => (
              <div key={skill.title}>
                <p className="text-[15px] font-semibold text-white">
                  {skill.title}
                </p>
                <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-white/55">
                  {skill.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

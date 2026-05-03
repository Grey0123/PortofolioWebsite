"use client";

import { useState } from "react";
import SectionAura from "./background/SectionAura";
import CandidCarousel, { type CandidSlide } from "./CandidCarousel";
import type { ApiCandidPhoto, ApiSkill, ApiTimelineItem } from "@/lib/api";

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

// Tab keys — kept as a literal union so a typo elsewhere is a TS error.
type TabKey = "skills" | "experience" | "education";

const TABS: { key: TabKey; label: string }[] = [
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
];

/* ----------------------- TIMELINE SUBCOMPONENT ---------------------- */
function Timeline({ items }: { items: ApiTimelineItem[] }) {
  return (
    <ol className="relative ml-4 mt-6 space-y-8 border-l border-white/10 pl-8">
      {items.map((item, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[33px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-accent bg-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            {item.period}
          </p>
          <h4 className="mt-1 text-lg font-semibold text-white">
            {item.title}
          </h4>
          <p className="text-sm text-white/70">{item.org}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {item.detail}
          </p>
        </li>
      ))}
    </ol>
  );
}

/* ----------------------- SKILLS SUBCOMPONENT ------------------------ */
function SkillsGrid({ items }: { items: ApiSkill[] }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-accent/40 hover:bg-white/[0.04]"
        >
          <p className="text-sm font-semibold text-accent">{item.title}</p>
          <p className="mt-1 text-sm text-muted">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

/* ----------------------- MAIN COMPONENT ----------------------------- */
// Props provided by the parent server component (app/page.tsx), which
// fetches the /content bundle and slices it down to what each section
// actually needs.
export default function About({
  skills = [],
  experience = [],
  education = [],
  candidPhotos = [],
}: {
  skills?: ApiSkill[];
  experience?: ApiTimelineItem[];
  education?: ApiTimelineItem[];
  candidPhotos?: ApiCandidPhoto[];
}) {
  const [active, setActive] = useState<TabKey>("skills");

  // Pick API data when present, otherwise the fallback. This keeps the
  // section useful before the gallery tables have been seeded.
  const slides =
    candidPhotos.length > 0 ? toSlides(candidPhotos) : FALLBACK_CANDID_SLIDES;

  return (
    <section id="about" className="relative overflow-hidden px-6 py-24 md:px-[10%]">
      <SectionAura color="cyan" position="top-left" />
      <div className="mx-auto flex max-w-[1400px] flex-col gap-12 md:flex-row md:items-start">
        <div className="md:basis-[35%]">
          <CandidCarousel slides={slides} />
        </div>

        <div className="md:basis-[60%]">
          <span className="text-sm uppercase tracking-[0.3em] text-accent">
            About Me
          </span>
          <h2 className="mt-2 text-4xl font-semibold md:text-6xl">
            Curious by nature, rigorous by habit
          </h2>
          <p className="mt-6 leading-relaxed text-muted">
            I&apos;m dedicated to continuous learning and adaptability — known
            for my diligence and ability to pick things up quickly. I thrive
            equally on independent problem-solving and team collaboration,
            always focused on both the craft and the outcome.
          </p>

          <div className="mt-8 flex gap-8 border-b border-white/10">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                className={`relative pb-3 text-base font-medium transition-colors md:text-lg ${
                  active === tab.key ? "text-white" : "text-muted hover:text-white"
                }`}
              >
                {tab.label}
                <span
                  className={`absolute -bottom-[2px] left-0 h-[3px] bg-accent transition-all duration-500 ${
                    active === tab.key ? "w-full" : "w-0"
                  }`}
                />
              </button>
            ))}
          </div>

          {active === "skills" && <SkillsGrid items={skills} />}
          {active === "experience" && <Timeline items={experience} />}
          {active === "education" && <Timeline items={education} />}
        </div>
      </div>
    </section>
  );
}

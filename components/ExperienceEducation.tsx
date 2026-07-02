// "Experience & Education" — the second half of the old combined About
// section, now its own section (matching the standalone design).
//
// The old About tabbed between separate "Experience" and "Education" panels.
// The standalone instead presents ONE chronological timeline where each row
// is badged as Work or Education. Since `ApiTimelineItem` already carries a
// `kind` field, we just merge the two arrays and let the badge do the
// distinguishing.
//
// No interactivity here → plain Server Component (no "use client").

import SectionAura from "./background/SectionAura";
import type { ApiTimelineItem } from "@/lib/api";

// Per-kind visual treatment. Keeping this in one map means the badge colour
// and label are defined once; add a new kind here if the data ever grows one.
// Work gets the site accent (it's the thing recruiters scan for);
// Education gets a calm periwinkle so it's distinct without competing.
const KIND: Record<ApiTimelineItem["kind"], { label: string; color: string }> = {
  experience: { label: "Work", color: "#ff4f7c" },
  education: { label: "Education", color: "#9aa0e8" },
};

export default function ExperienceEducation({
  experience = [],
  education = [],
}: {
  experience?: ApiTimelineItem[];
  education?: ApiTimelineItem[];
}) {
  // Merge into a single timeline. Experience first (the most recent roles),
  // then education — which matches both the seed ordering and the standalone's
  // single "path so far" list. If you'd rather interleave strictly by date,
  // you'd need a sortable date on each row (the `period` strings aren't).
  const timeline: ApiTimelineItem[] = [...experience, ...education];

  return (
    <section
      id="experience"
      className="relative overflow-x-clip px-6 py-24 md:px-[10%]"
    >
      <SectionAura color="magenta" position="bottom-right" opacity={0.12} />

      <div className="relative mx-auto max-w-[1180px]">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
          02 / The path so far
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          Experience &amp; education
        </h2>

        {/* Timeline. Each row is a 2-col grid (meta | content) with a top
            border, so the stack reads as a ruled list. A trailing border
            closes the last row. */}
        <div className="mt-12 flex flex-col">
          {timeline.map((item, i) => {
            const kind = KIND[item.kind];
            return (
              <div
                key={`${item.kind}-${i}`}
                className="grid gap-3 border-t border-white/[0.08] py-7 md:grid-cols-[170px_1fr] md:gap-9"
              >
                {/* LEFT: period + Work/Education badge */}
                <div>
                  <div className="font-mono text-[13px] tracking-wide text-white/90">
                    {item.period}
                  </div>
                  <div
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em]"
                    style={{ borderColor: `${kind.color}66`, color: kind.color }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: kind.color }}
                    />
                    {kind.label}
                  </div>
                </div>

                {/* RIGHT: role + org + detail */}
                <div>
                  <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                    {item.title}
                  </h3>
                  <div className="mt-1.5 text-[15px] font-medium text-accent">
                    {item.org}
                  </div>
                  <p className="mt-3.5 max-w-[680px] leading-relaxed text-muted">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
          <div className="border-t border-white/[0.08]" />
        </div>
      </div>
    </section>
  );
}

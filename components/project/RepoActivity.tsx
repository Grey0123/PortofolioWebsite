// A rolling year of commit activity, drawn as a column-per-week strip.
//
// This isn't in the original mockup — it's an addition, and a cheap one:
// GitHub's /stats/commit_activity endpoint returns exactly 52 weeks, so the
// data was already coming down with the rest of the repo metadata.
//
// Why it earns its place on a portfolio page: star counts are a popularity
// signal you don't control, but a commit history is evidence of sustained
// work. For a recruiter skimming, "this person kept at it for eight months"
// is a more useful fact than "38 stars".
//
// Server Component — pure SVG, no interactivity beyond native tooltips.

import type { RepoWeek } from "@/lib/github";

export default function RepoActivity({ weeks }: { weeks: RepoWeek[] }) {
  // GitHub returns 202-with-no-body while it computes stats for a repo it
  // hasn't cached, so an empty array is a normal transient state, not an
  // error. Render nothing and let the next revalidate pick it up.
  if (weeks.length === 0) return null;

  const total = weeks.reduce((sum, w) => sum + w.total, 0);
  if (total === 0) return null;

  const peak = Math.max(...weeks.map((w) => w.total));

  // Fixed viewBox + `width:100%` on the SVG = the chart scales to whatever
  // column it lands in, with no resize listener and no layout measurement.
  // Doing this in SVG rather than a row of divs is what keeps it a Server
  // Component: no JS ships at all.
  const BAR_W = 5;
  const GAP = 2;
  const HEIGHT = 34;
  const width = weeks.length * (BAR_W + GAP) - GAP;

  const monthFmt = new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  });

  const first = monthFmt.format(new Date(weeks[0].weekStart));
  const last = monthFmt.format(new Date(weeks[weeks.length - 1].weekStart));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
          Commit activity
        </span>
        <span className="font-mono text-[11.5px] text-white/40">
          {total.toLocaleString()} in the last year
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        // preserveAspectRatio="none" lets the bars stretch horizontally to
        // fill the container while keeping their heights honest. Without it
        // the whole chart would letterbox and leave dead space.
        preserveAspectRatio="none"
        className="mt-2.5 h-[34px] w-full"
        role="img"
        aria-label={`${total} commits between ${first} and ${last}`}
      >
        {weeks.map((week, i) => {
          // Scale against the peak week, with a 2px floor so a week with a
          // single commit is still visible. Scaling against the peak rather
          // than a fixed maximum means a quiet project's chart is still
          // readable instead of a flat line.
          const h = week.total === 0 ? 1 : Math.max(2, (week.total / peak) * HEIGHT);

          return (
            <rect
              key={week.weekStart}
              x={i * (BAR_W + GAP)}
              y={HEIGHT - h}
              width={BAR_W}
              height={h}
              rx={1}
              // Empty weeks get a faint placeholder so the gaps read as
              // "nothing happened" rather than as missing data.
              fill={week.total === 0 ? "#ffffff" : "#ff004f"}
              opacity={week.total === 0 ? 0.07 : 0.35 + (week.total / peak) * 0.65}
            >
              {/* <title> inside an SVG shape is the native tooltip — no
                  library, no state, works on hover and for screen readers. */}
              <title>{`Week of ${week.weekStart}: ${week.total} commit${week.total === 1 ? "" : "s"}`}</title>
            </rect>
          );
        })}
      </svg>

      <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-white/25">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </div>
  );
}

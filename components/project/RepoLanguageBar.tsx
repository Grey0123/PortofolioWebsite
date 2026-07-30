// The language breakdown bar — a segmented strip plus a colour-coded
// legend, exactly like the one under a GitHub repo's file list.
//
// Server Component. Percentages are computed in lib/github.ts (largest
// remainder, so they sum to exactly 100 and the bar always fills).

import type { RepoLanguage } from "@/lib/github";

export default function RepoLanguageBar({
  languages,
}: {
  languages: RepoLanguage[];
}) {
  if (languages.length === 0) return null;

  return (
    <div>
      {/* The bar itself. `gap-0.5` draws the hairline separators GitHub uses
          between segments — cheaper and crisper than giving each segment a
          border, which would change its box width and throw the totals off. */}
      <div
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
        // The whole strip is one labelled image to a screen reader. Without
        // this it announces as a run of empty divs; with it, a single
        // sentence conveys the same thing the sighted reader gets at a
        // glance. This is usually a better a11y answer than tagging each
        // segment individually.
        role="img"
        aria-label={`Language breakdown: ${languages
          .map((l) => `${l.name} ${l.pct}%`)
          .join(", ")}`}
      >
        {languages.map((lang) => (
          <span
            key={lang.name}
            // Width and colour are per-language values from an API, so they
            // can't be Tailwind classes — Tailwind generates CSS at build
            // time by scanning source for literal class strings, and
            // `w-[${pct}%]` is invisible to that scan. Inline style is the
            // correct tool for genuinely dynamic values, not a shortcut.
            style={{ width: `${lang.pct}%`, backgroundColor: lang.color }}
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {languages.map((lang) => (
          <li
            key={lang.name}
            className="flex items-center gap-2 font-mono text-[11.5px] text-white/60"
          >
            <span
              className="h-[9px] w-[9px] shrink-0 rounded-full"
              style={{ backgroundColor: lang.color }}
              aria-hidden="true"
            />
            {lang.name}
            <span className="text-white/35">{lang.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

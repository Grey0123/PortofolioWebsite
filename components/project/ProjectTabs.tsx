"use client";

// The Code / Screenshots / README tab bar on a project page.
//
// WHY THIS IS THE ONLY CLIENT COMPONENT ON THE PAGE
// -------------------------------------------------
// Switching tabs needs `useState`, and state needs the browser — so this
// file gets "use client". But notice what it does NOT do: it doesn't fetch
// anything, doesn't know what a project is, and doesn't render any of the
// actual content.
//
// The three panels are passed in as `children`, already rendered on the
// server. React serialises them as part of the RSC payload and hands them
// to this component as opaque, pre-rendered output — so the markdown
// renderer, the file list, and next/image all stay server-side, and the
// only JavaScript the visitor downloads for this feature is the ~40 lines
// below.
//
// That's the pattern worth internalising: when something needs to be
// interactive, push "use client" to the smallest possible leaf and pass
// server-rendered content INTO it, rather than making the parent a Client
// Component and dragging everything it renders across the boundary with it.
//
// The related trap (documented in CLAUDE.md): you can pass rendered JSX
// across this boundary all day, but you cannot pass a FUNCTION — including
// a react-icons component. That's why `icon` below is a plain string the
// client maps to an SVG itself.

import { useId, useState } from "react";
import type { ReactNode } from "react";

export type ProjectTab = {
  /** Stable key, also used for the anchor id. */
  id: string;
  label: string;
  /** Optional count chip, e.g. the number of screenshots. */
  count?: number;
  /** "code" draws the </> glyph; anything else draws nothing. */
  icon?: "code";
  /** Server-rendered panel content. */
  content: ReactNode;
};

export default function ProjectTabs({ tabs }: { tabs: ProjectTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  // useId gives a stable, SSR-safe unique prefix. Hard-coding ids like
  // "panel-code" would collide if this component ever appeared twice on a
  // page, and a Math.random() prefix would differ between the server render
  // and hydration — the classic hydration-mismatch warning.
  const uid = useId();

  if (tabs.length === 0) return null;

  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      {/* role="tablist" + the aria wiring below is what makes this usable
          with a screen reader and a keyboard. A row of <div>s that change
          colour on click is invisible to both. */}
      <div
        role="tablist"
        aria-label="Project sections"
        className="flex gap-6 overflow-x-auto border-b border-white/10 sm:gap-7"
      >
        {tabs.map((tab) => {
          const on = tab.id === current.id;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`${uid}-tab-${tab.id}`}
              aria-selected={on}
              aria-controls={`${uid}-panel-${tab.id}`}
              // Roving tabindex: only the active tab is in the tab order, so
              // Tab moves past the whole group rather than through every
              // option — the behaviour the ARIA tabs pattern specifies.
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const i = tabs.findIndex((t) => t.id === current.id);
                // Modulo wraps in both directions; adding tabs.length first
                // keeps the result positive when arrowing left from index 0.
                const next =
                  e.key === "ArrowRight"
                    ? (i + 1) % tabs.length
                    : (i - 1 + tabs.length) % tabs.length;
                setActive(tabs[next].id);
              }}
              className={[
                "relative -mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-1 py-3.5 text-sm transition-colors",
                on
                  ? "border-accent text-white"
                  : "border-transparent text-white/55 hover:text-white",
              ].join(" ")}
            >
              {tab.icon === "code" && (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill={on ? "#ff004f" : "currentColor"}
                  aria-hidden="true"
                >
                  <path d="M4.7 11.7 1 8l3.7-3.7 1 1L3 8l2.7 2.7-1 1Zm6.6 0-1-1L13 8l-2.7-2.7 1-1L15 8l-3.7 3.7Z" />
                </svg>
              )}
              {tab.label}
              {typeof tab.count === "number" && (
                <span className="rounded-full bg-white/10 px-[7px] py-px font-mono text-[11px] text-white/80">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Only the active panel is mounted. The alternative — rendering all
          three and hiding two with CSS — keeps scroll position and avoids a
          re-render, but it also means the browser lays out every screenshot
          and the entire README on first paint. For a page whose README can
          be long, mounting one panel is the better trade. */}
      <div
        role="tabpanel"
        id={`${uid}-panel-${current.id}`}
        aria-labelledby={`${uid}-tab-${current.id}`}
        tabIndex={0}
        className="pt-6 focus:outline-none"
      >
        {current.content}
      </div>
    </div>
  );
}

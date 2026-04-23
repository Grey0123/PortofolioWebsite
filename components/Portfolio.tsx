// Client component because we hold the active filter in local state and
// animate the grid layout as the visible set of cards changes. The section
// is purely presentational — project data lives in lib/works.ts, so adding
// a new project never touches this file.
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { FaExternalLinkAlt, FaGithub, FaStar } from "react-icons/fa";

import SectionAura from "./background/SectionAura";
import {
  CATEGORIES,
  WORKS,
  getCategory,
  type FilterId,
  type Work,
} from "@/lib/works";

/* =========================================================================
 * <Portfolio /> — "My Work" section
 * =========================================================================
 * Layout:
 *   heading  →  filter pills  →  responsive card grid  →  empty state
 *
 * The filter pills include an "All" option and per-category chips with a
 * count badge. Selecting a chip filters the grid; framer-motion's LayoutGroup
 * + AnimatePresence give us smooth reflow as cards enter/exit.
 * ========================================================================= */
export default function Portfolio() {
  const [active, setActive] = useState<FilterId>("all");

  // Per-category counts — shown as a subscript on each chip so the user can
  // tell at a glance how many projects live under each filter.
  const counts = useMemo(() => {
    const map: Record<FilterId, number> = {
      all: WORKS.length,
      data: 0,
      automation: 0,
      ai: 0,
      web: 0,
      analytics: 0,
    };
    for (const w of WORKS) map[w.category] += 1;
    return map;
  }, []);

  // Filtered list of works. Memoized so we don't reallocate on unrelated
  // re-renders (e.g. parent hover state changes).
  const visible = useMemo(
    () => (active === "all" ? WORKS : WORKS.filter((w) => w.category === active)),
    [active]
  );

  return (
    <section
      id="portfolio"
      className="relative overflow-hidden px-6 py-24 md:px-[10%]"
    >
      <SectionAura color="pink" position="top-right" opacity={0.16} />

      <div className="relative mx-auto max-w-[1400px]">
        {/* Section heading + subhead */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-4xl font-semibold md:text-6xl">My Work</h2>
            <p className="mt-4 max-w-2xl text-muted">
              A selection of projects across data engineering, automation, and
              AI. Filter by category or browse everything.
            </p>
          </div>

          {/* Live counter — ticks up automatically as projects are added. */}
          <p className="text-sm uppercase tracking-[0.3em] text-muted">
            <span className="text-accent">●</span>{" "}
            {WORKS.length} project{WORKS.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* ---------- Filter pills ---------- */}
        <FilterBar
          active={active}
          onChange={setActive}
          counts={counts}
        />

        {/* ---------- Grid ----------
            LayoutGroup lets cards animate into their new positions smoothly
            when the filter changes (instead of snapping). */}
        <LayoutGroup>
          <motion.div
            layout
            className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {visible.map((work) => (
                <WorkCard key={work.title} work={work} />
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>

        {/* ---------- Empty state ----------
            Shown when a filter matches zero projects — purely informational,
            never displayed while "All" is active (which always has >=0 kept
            gracefully anyway). */}
        {visible.length === 0 && (
          <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-12 text-center text-muted">
            <p className="text-lg">
              Nothing here yet — new {getCategory(active as any).label.toLowerCase()} work is on the way.
            </p>
            <button
              onClick={() => setActive("all")}
              className="mt-4 text-sm text-accent hover:underline"
            >
              Show all projects
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================================================================
 * <FilterBar /> — the chip row
 * =========================================================================
 * Each chip is a button with an icon + label + count. The active chip is
 * styled with the category's accent color; inactive chips have a subtle
 * glass look. A `motion.span` sliding pill would be nicer but since chips
 * can wrap onto multiple lines we'd need to measure DOM positions — the
 * current transition (bg/border tween) is smooth enough and simpler.
 * ========================================================================= */
function FilterBar({
  active,
  onChange,
  counts,
}: {
  active: FilterId;
  onChange: (id: FilterId) => void;
  counts: Record<FilterId, number>;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter projects by category"
      className="mt-10 flex flex-wrap gap-2"
    >
      <FilterChip
        id="all"
        label="All"
        count={counts.all}
        active={active === "all"}
        onClick={() => onChange("all")}
      />
      {CATEGORIES.map((c) => (
        <FilterChip
          key={c.id}
          id={c.id}
          label={c.label}
          count={counts[c.id]}
          color={c.color}
          Icon={c.Icon}
          active={active === c.id}
          onClick={() => onChange(c.id)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  id,
  label,
  count,
  active,
  onClick,
  color,
  Icon,
}: {
  id: FilterId;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
  Icon?: React.ComponentType<{ className?: string }>;
}) {
  // Chips with zero items aren't disabled — we still let the user select
  // them so they can see the empty state and understand the category exists.
  // The count badge subtly communicates emptiness with lower opacity.
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls="portfolio-grid"
      data-filter={id}
      onClick={onClick}
      className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all ${
        active
          ? "border-transparent text-white shadow-[0_0_24px_rgba(255,0,79,0.25)]"
          : "border-white/10 bg-white/[0.03] text-muted hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
      }`}
      style={
        active
          ? {
              // Chip tints to the category's color when active (or accent red
              // for "All"). The `color` field on each Category keeps this in
              // one place — no chip-specific styling in this component.
              backgroundColor: color ?? "#ff004f",
            }
          : undefined
      }
    >
      {Icon && (
        <Icon
          className={`text-xs ${active ? "text-white" : "text-white/40 group-hover:text-white/70"}`}
        />
      )}
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 text-[10px] tabular-nums ${
          active
            ? "bg-white/20 text-white"
            : count === 0
            ? "bg-white/5 text-white/30"
            : "bg-white/10 text-white/70"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* =========================================================================
 * <WorkCard /> — single project tile
 * =========================================================================
 * Always-visible:
 *   - category chip (top-left)
 *   - year (top-right)
 *   - title (bottom, on gradient)
 * On hover:
 *   - image scales subtly
 *   - description + tech chips + action buttons slide up
 *   - accent glow on the card border
 *
 * Missing images are handled by <WorkThumbnail />, which renders a category-
 * tinted gradient with the category's icon — so the grid stays presentable
 * while you're still sourcing real screenshots.
 * ========================================================================= */
function WorkCard({ work }: { work: Work }) {
  const cat = getCategory(work.category);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`group relative overflow-hidden rounded-2xl border bg-white/[0.02] backdrop-blur-sm transition-colors duration-300 ${
        work.featured
          ? "border-accent/30 hover:border-accent/60"
          : "border-white/10 hover:border-white/25"
      }`}
    >
      {/* Decorative glow — intensifies on hover, colored by the category. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40"
        style={{ background: `radial-gradient(circle at 50% 0%, ${cat.color}, transparent 70%)` }}
      />

      {/* Image / fallback — aspect ratio stays constant so the grid is tidy
          regardless of whether a thumbnail exists. */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <WorkThumbnail work={work} />

        {/* Gradient scrim — always visible, darker near the bottom so the
            title reads on any screenshot. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
        />

        {/* Top-left: category chip */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm"
            style={{ borderColor: `${cat.color}55` }}
          >
            <cat.Icon className="text-[10px]" style={{ color: cat.color }} />
            {cat.label}
          </span>
          {work.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/90 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
              <FaStar className="text-[9px]" /> Featured
            </span>
          )}
        </div>

        {/* Top-right: year */}
        <div className="absolute right-3 top-3">
          <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm">
            {work.year}
          </span>
        </div>

        {/* Bottom: title (always visible) */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="text-lg font-semibold text-white md:text-xl">
            {work.title}
          </h3>
        </div>
      </div>

      {/* Info panel — always visible; description + tech + links live here.
          Splitting image/info (instead of a slide-up overlay) means the card
          reads the same on touch as on desktop, no hover dependency. */}
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm leading-relaxed text-muted">
          {work.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {work.tech.map((t) => (
            <span
              key={t}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Action row — only renders if at least one link is defined, so the
            card doesn't have an empty button strip for WIP projects. */}
        {(work.href || work.github) && (
          <div className="mt-1 flex items-center gap-3 border-t border-white/5 pt-4">
            {work.href && (
              <ActionLink href={work.href} label="Live">
                <FaExternalLinkAlt className="text-xs" />
              </ActionLink>
            )}
            {work.github && (
              <ActionLink href={work.github} label="Code">
                <FaGithub className="text-sm" />
              </ActionLink>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}

/* Thumbnail renderer — picks between the project's own image and a
 * category-tinted gradient fallback. Using next/image keeps the image-based
 * path fast (lazy-loaded, responsive srcset); the fallback is pure CSS so
 * it costs nothing. */
function WorkThumbnail({ work }: { work: Work }) {
  const cat = getCategory(work.category);

  if (work.image) {
    return (
      <Image
        src={work.image}
        alt={work.title}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />
    );
  }

  // Fallback — tinted gradient with a big, semi-transparent category icon.
  // Scales up slightly on hover so it matches the image card's behavior.
  return (
    <div
      className="absolute inset-0 flex items-center justify-center transition-transform duration-700 group-hover:scale-105"
      style={{
        background: `
          radial-gradient(circle at 30% 20%, ${cat.color}55, transparent 60%),
          radial-gradient(circle at 70% 80%, ${cat.color}33, transparent 55%),
          linear-gradient(135deg, #141418 0%, #0a0a10 100%)
        `,
      }}
    >
      <cat.Icon className="text-6xl text-white/10" />
    </div>
  );
}

/* Small shared component for the Live / Code icon-label links at the
 * bottom of each card. Using <Link> when the href is internal and a plain
 * anchor otherwise would be overkill here since all portfolio links point
 * externally in practice — so we use <Link> everywhere for consistency. */
function ActionLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-xs font-medium text-white/70 transition-colors hover:text-accent"
    >
      {children}
      {label}
    </Link>
  );
}

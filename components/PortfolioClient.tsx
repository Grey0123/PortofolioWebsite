// Client half of the Portfolio section. Owns the filter state and renders
// the cards. The Server Component wrapper (components/Portfolio.tsx) is
// the one that fetches from Supabase and hands us the `works` prop — that
// way Supabase credentials and the fetch itself never ship to the browser.
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { FaExternalLinkAlt, FaGithub, FaStar } from "react-icons/fa";
import type { IconType } from "react-icons";

import {
  CATEGORIES,
  getCategory,
  type FilterId,
  type Work,
} from "@/lib/works";

/* =========================================================================
 * <PortfolioClient /> — filter UI + grid
 * =========================================================================
 * Receives the full list of works from the server and handles:
 *   - active category filter (local state)
 *   - animated grid reflow when the filter changes
 *   - per-category counts
 *   - empty state when a filter matches nothing
 *
 * Pure presentation — knows nothing about Supabase or network.
 * ========================================================================= */
export default function PortfolioClient({ works }: { works: Work[] }) {
  const [active, setActive] = useState<FilterId>("all");

  // Per-category counts — shown as a subscript on each chip so the user
  // can tell at a glance how many projects live under each filter.
  const counts = useMemo(() => {
    const map: Record<FilterId, number> = {
      all: works.length,
      data: 0,
      automation: 0,
      ai: 0,
      web: 0,
      analytics: 0,
    };
    for (const w of works) map[w.category] += 1;
    return map;
  }, [works]);

  // Filtered list of works. Memoized so we don't reallocate on unrelated
  // re-renders.
  const visible = useMemo(
    () => (active === "all" ? works : works.filter((w) => w.category === active)),
    [active, works]
  );

  return (
    <>
      {/* Section heading + live counter */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-4xl font-semibold md:text-6xl">My Work</h2>
          <p className="mt-4 max-w-2xl text-muted">
            A selection of projects across data engineering, automation, and
            AI. Filter by category or browse everything.
          </p>
        </div>

        <p className="text-sm uppercase tracking-[0.3em] text-muted">
          <span className="text-accent">●</span>{" "}
          {works.length} project{works.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* ---------- Filter pills ---------- */}
      <FilterBar active={active} onChange={setActive} counts={counts} />

      {/* ---------- Grid ----------
          LayoutGroup lets cards animate into their new positions smoothly
          when the filter changes (instead of snapping).

          NOTE: AnimatePresence here uses the default "sync" mode (no `mode`
          prop). We previously had `mode="popLayout"`, but combined with
          LayoutGroup it could leave items stranded at opacity 0 when the
          user toggled filters back-and-forth quickly: the framework still
          considered the prior exit "in progress" when the same item
          reappeared, and never re-ran the initial→animate transition.
          Sync mode renders new items immediately and animates exits in
          place, which is more robust here. */}
      <LayoutGroup>
        <motion.div
          layout
          className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence>
            {visible.map((work) => (
              <WorkCard key={work.title} work={work} />
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {/* ---------- Empty state ---------- */}
      {visible.length === 0 && (
        <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-12 text-center text-muted">
          <p className="text-lg">
            {works.length === 0
              ? "No projects in the database yet — add a row to `works` in Supabase to see it appear here."
              : `Nothing here yet — new ${getCategory(active as Exclude<FilterId, "all">).label.toLowerCase()} work is on the way.`}
          </p>
          {works.length > 0 && (
            <button
              onClick={() => setActive("all")}
              className="mt-4 text-sm text-accent hover:underline"
            >
              Show all projects
            </button>
          )}
        </div>
      )}
    </>
  );
}

/* =========================================================================
 * <FilterBar /> — the chip row
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
  Icon?: IconType;
}) {
  // Zero-count chips aren't disabled — we let the user click them so they
  // see the empty state and understand the category exists.
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
      style={active ? { backgroundColor: color ?? "#ff004f" } : undefined}
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

      {/* Image / fallback */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <WorkThumbnail work={work} />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
        />

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

        <div className="absolute right-3 top-3">
          <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm">
            {work.year}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="text-lg font-semibold text-white md:text-xl">
            {work.title}
          </h3>
        </div>
      </div>

      {/* Info panel */}
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm leading-relaxed text-muted">{work.description}</p>

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

  // Category-tinted gradient fallback for projects without a thumbnail yet.
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

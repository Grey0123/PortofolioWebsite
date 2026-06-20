// Portfolio metadata — types + category definitions.
//
// Project rows themselves are fetched from the FastAPI backend and
// converted to the `Work` view-model below. This file owns the things
// that make sense to live in source code (category colors, icons,
// labels) so the UI doesn't need a round-trip to render chips.

import type { IconType } from "react-icons";
import { FaCode } from "react-icons/fa";
import type { ApiCategory, ApiWork } from "./api";
import { getIcon } from "./icons";

/* ------------------------------------------------------------------
 * Categories
 * ------------------------------------------------------------------
 * Each project belongs to exactly one category. Categories drive the
 * filter chips at the top of the section.
 *
 * Categories now live in the `categories` table in Supabase, fetched as
 * part of the /content bundle. To ADD one, insert a row in the dashboard
 * (id, label, color, icon) — no code change, no redeploy. The `icon`
 * column stores a react-icons NAME ("FaDatabase") which getIcon() resolves
 * to a component; if the name isn't in lib/icons.ts the chip shows FaCode.
 *
 * `CategoryId` / `FilterId` are now plain strings (the DB foreign key,
 * not the TypeScript compiler, is what guarantees a category is valid).
 * The "all" pseudo-category is only used by the filter UI — no project
 * should ever carry it.
 */
export type CategoryId = string;

export type FilterId = string; // "all" | <category id>

export type Category = {
  id: CategoryId;
  label: string;
  color: string;
  Icon: IconType;
};

/**
 * Fallback list used only when the API returns no categories — e.g. before
 * the categories migration has run, or if the backend is unreachable. Keeps
 * the filter bar populated instead of collapsing to just "All". Mirrors the
 * original hardcoded set.
 */
export const FALLBACK_CATEGORIES: Category[] = [
  { id: "data",       label: "Data Engineering", color: "#00b7ff", Icon: getIcon("FaDatabase") },
  { id: "automation", label: "Automation",       color: "#ff30ff", Icon: getIcon("FaRobot") },
  { id: "ai",         label: "AI / ML",          color: "#ffa94d", Icon: getIcon("FaBrain") },
  { id: "analytics",  label: "Analytics",        color: "#9d7bff", Icon: getIcon("FaChartLine") },
  { id: "web",        label: "Web",              color: "#ff004f", Icon: getIcon("FaCode") },
];

// Neutral fallback for a work whose category id matches no known category
// (e.g. a category was deleted out from under existing rows).
const UNKNOWN_CATEGORY: Category = {
  id: "unknown",
  label: "Other",
  color: "#8a8a99",
  Icon: FaCode,
};

/** Convert an ApiCategory (string icon name) into the UI Category (component). */
export function toCategory(api: ApiCategory): Category {
  return {
    id: api.id,
    label: api.label,
    color: api.color,
    Icon: getIcon(api.icon),
  };
}

/** Resolve a category by id against a list, with a safe fallback. */
export function getCategory(id: CategoryId, categories: Category[]): Category {
  return categories.find((c) => c.id === id) ?? UNKNOWN_CATEGORY;
}
// getCategory now takes the (DB-driven) category list as its second arg.

/* ------------------------------------------------------------------
 * Work view-model
 * ------------------------------------------------------------------ */
export type Work = {
  title: string;
  description: string;
  category: CategoryId;
  tech: string[];
  year: number;
  image?: string;
  href?: string;
  github?: string;
  featured?: boolean;
};

/**
 * Convert an ApiWork (from /works) into the Work shape the UI consumes.
 * The two shapes are nearly identical — the converter exists mainly to
 * normalize null → undefined so downstream components can use simple
 * optional-chaining instead of explicit null checks.
 */
export function toWork(api: ApiWork): Work {
  return {
    title: api.title,
    description: api.description,
    category: api.category,
    tech: api.tech,
    year: api.year,
    image: api.image ?? undefined,
    href: api.href ?? undefined,
    github: api.github ?? undefined,
    featured: api.featured ?? false,
  };
}

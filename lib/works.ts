// Portfolio metadata — types + category definitions.
//
// Project rows themselves are fetched from the FastAPI backend and
// converted to the `Work` view-model below. This file owns the things
// that make sense to live in source code (category colors, icons,
// labels) so the UI doesn't need a round-trip to render chips.

import type { IconType } from "react-icons";
import {
  FaDatabase,
  FaRobot,
  FaBrain,
  FaCode,
  FaChartLine,
} from "react-icons/fa";
import type { ApiWork } from "./api";

/* ------------------------------------------------------------------
 * Categories
 * ------------------------------------------------------------------
 * Each project belongs to exactly one category. Categories drive the
 * filter chips at the top of the section. If you add a new one, update
 * THREE places in lockstep:
 *   1. `CategoryId` union below
 *   2. `CATEGORIES` array below
 *   3. The CHECK constraint on the `works.category` column in
 *      supabase/schema.sql (and run it against the live DB).
 *
 * The "all" pseudo-category is only used by the filter UI — no project
 * should ever carry it.
 */
export type CategoryId =
  | "data"
  | "automation"
  | "ai"
  | "web"
  | "analytics";

export type FilterId = "all" | CategoryId;

export type Category = {
  id: CategoryId;
  label: string;
  color: string;
  Icon: IconType;
};

export const CATEGORIES: Category[] = [
  { id: "data",       label: "Data Engineering", color: "#00b7ff", Icon: FaDatabase },
  { id: "automation", label: "Automation",       color: "#ff30ff", Icon: FaRobot },
  { id: "ai",         label: "AI / ML",          color: "#ffa94d", Icon: FaBrain },
  { id: "analytics",  label: "Analytics",        color: "#9d7bff", Icon: FaChartLine },
  { id: "web",        label: "Web",              color: "#ff004f", Icon: FaCode },
];

export function getCategory(id: CategoryId): Category {
  const found = CATEGORIES.find((c) => c.id === id);
  return found ?? CATEGORIES[0];
}

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

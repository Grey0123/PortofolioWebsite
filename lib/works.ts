// Central registry for portfolio projects. Adding a new project is literally
// just appending an object to `WORKS` — the Portfolio section filters and
// renders from this list automatically. Keeping the data out of the component
// means the component never has to change as the portfolio grows.

import type { ComponentType } from "react";
import {
  FaDatabase,
  FaRobot,
  FaBrain,
  FaCode,
  FaChartLine,
} from "react-icons/fa";

/* ------------------------------------------------------------------
 * Categories
 * ------------------------------------------------------------------
 * Each project belongs to exactly one category. Categories drive the
 * filter chips at the top of the section. If you introduce a new one,
 * add it here (id, label, accent color, icon) and every project that
 * references it will slot right in. The "all" pseudo-category is only
 * used by the filter UI — no project should ever use it.
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
  // Accent color used on the chip pill and on the gradient fallback tile
  // when a project has no image yet. Tailwind-safe hex so it works in
  // arbitrary value classes AND inline styles.
  color: string;
  // Icon shown on the fallback tile and (small) on the chip.
  Icon: ComponentType<{ className?: string }>;
};

export const CATEGORIES: Category[] = [
  { id: "data",       label: "Data Engineering", color: "#00b7ff", Icon: FaDatabase },
  { id: "automation", label: "Automation",       color: "#ff30ff", Icon: FaRobot },
  { id: "ai",         label: "AI / ML",          color: "#ffa94d", Icon: FaBrain },
  { id: "analytics",  label: "Analytics",        color: "#9d7bff", Icon: FaChartLine },
  { id: "web",        label: "Web",              color: "#ff004f", Icon: FaCode },
];

// Helper — callers that need a category by id without scanning the array.
export function getCategory(id: CategoryId): Category {
  const found = CATEGORIES.find((c) => c.id === id);
  // Shouldn't happen because TypeScript constrains the input, but we fall
  // back to the first category rather than crashing the UI at runtime.
  return found ?? CATEGORIES[0];
}

/* ------------------------------------------------------------------
 * Works
 * ------------------------------------------------------------------
 * Fields:
 *   title       — short, scannable headline.
 *   description — one sentence explaining what/why. Shown on hover.
 *   category    — picks which filter chip shows this card.
 *   tech        — small chips on the card. Keep to 3–5 items.
 *   year        — shown in the corner; also useful for ordering later.
 *   image       — optional. If missing, a gradient fallback is rendered.
 *   href        — optional live demo / case study link.
 *   github      — optional repo link.
 *   featured    — if true, the card gets a subtle highlight border.
 */
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

export const WORKS: Work[] = [
  {
    title: "Web Scraping + Telegram Bot",
    description:
      "Scrapes live car listings across Indonesian e-commerce sites and pushes a daily price summary to a Telegram channel.",
    category: "automation",
    tech: ["Python", "BeautifulSoup", "Telegram API"],
    year: 2024,
    image: "/images/work-1.png",
    featured: true,
  },
  {
    title: "Multi-Platform Product Comparison",
    description:
      "Aggregates product listings from multiple marketplaces so shoppers can compare price, stock, and seller reliability side-by-side.",
    category: "data",
    tech: ["Python", "Pandas", "Streamlit"],
    year: 2024,
    image: "/images/work-2.png",
  },
  {
    title: "AML Reporting System",
    description:
      "Oracle-backed Anti-Money-Laundering XML reporting pipeline that flags suspicious transactions and generates regulator-ready files.",
    category: "data",
    tech: ["Oracle", "PL/SQL", "XML"],
    year: 2023,
    image: "/images/work-3.png",
  },
];

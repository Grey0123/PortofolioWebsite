/**
 * Typed fetcher for the FastAPI backend.
 *
 * Every server component that needs CMS data calls one of the helpers
 * below — that way the URL, error handling, and Next.js cache config
 * live in one place. The shapes here MUST match `api/schemas.py` on
 * the backend; if you change one, change the other.
 *
 * Caching strategy:
 *   - We use Next.js's built-in `fetch` extension `next: { revalidate }`
 *     instead of React's `cache()` so pages are statically rendered with
 *     ISR — the JSON is cached at the edge and refreshed in the background
 *     after `revalidate` seconds. Perfect for content that changes a few
 *     times a week, not a few times a second.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// How long Next can serve stale data before re-fetching from FastAPI.
// 60s is the same value we used when we hit Supabase directly.
const REVALIDATE_SECONDS = 60;

/* ------------------------------------------------------------------
 * Wire types (mirror api/schemas.py)
 * ------------------------------------------------------------------ */

export type ApiWork = {
  title: string;
  description: string;
  category: "data" | "automation" | "ai" | "web" | "analytics";
  tech: string[];
  year: number;
  image?: string | null;
  href?: string | null;
  github?: string | null;
  featured?: boolean;
};

export type ApiRotatingRole = { label: string };

export type ApiStat = {
  icon: string;
  label: string;
  value_number?: number | null;
  value_text?: string | null;
  suffix?: string | null;
};

export type ApiSkill = { title: string; detail: string };

export type ApiTimelineItem = {
  kind: "experience" | "education";
  period: string;
  title: string;
  org: string;
  detail: string;
};

export type ApiService = {
  icon: string;
  title: string;
  tagline: string;
  description: string;
  color: string;
  tech: string[];
};

export type ApiContactInfo = {
  email: string;
  phone?: string | null;
  cv_url?: string | null;
};

export type ApiSocialLink = { platform: string; url: string; icon: string };

export type ApiOrbitTool = { name: string; icon?: string | null };

export type ApiOrbitService = {
  slug: string;
  name: string;
  short_name: string;
  tagline: string;
  color: string;
  icon: string;
  tools: ApiOrbitTool[];
};

export type ApiContentBundle = {
  rotating_roles: ApiRotatingRole[];
  stats: ApiStat[];
  skills: ApiSkill[];
  experience: ApiTimelineItem[];
  education: ApiTimelineItem[];
  services: ApiService[];
  contact_info: ApiContactInfo | null;
  social_links: ApiSocialLink[];
  orbit_services: ApiOrbitService[];
};

/* ------------------------------------------------------------------
 * Internal helper
 * ------------------------------------------------------------------ */

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      // Next.js extension: cache + revalidate window. Equivalent to
      // `export const revalidate = 60` at the page level, but scoped
      // per-fetch so different endpoints could have different TTLs.
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.error(`[api] ${path} returned ${res.status}`);
      return fallback;
    }
    return (await res.json()) as T;
  } catch (err) {
    // Most common cause in dev: FastAPI isn't running. Render an empty
    // state instead of crashing the page so you still see the layout.
    console.error(`[api] ${path} fetch failed:`, err);
    return fallback;
  }
}

/* ------------------------------------------------------------------
 * Public helpers
 * ------------------------------------------------------------------ */

export async function fetchWorks(): Promise<ApiWork[]> {
  return getJson<ApiWork[]>("/works", []);
}

const EMPTY_BUNDLE: ApiContentBundle = {
  rotating_roles: [],
  stats: [],
  skills: [],
  experience: [],
  education: [],
  services: [],
  contact_info: null,
  social_links: [],
  orbit_services: [],
};

export async function fetchContent(): Promise<ApiContentBundle> {
  return getJson<ApiContentBundle>("/content", EMPTY_BUNDLE);
}

/**
 * Submit the contact form. Used from the (client-side) Contact form.
 * Returns `true` on success, `false` on any failure — the form decides
 * how to show the error.
 */
export async function submitMessage(payload: {
  name: string;
  email: string;
  message: string | null;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error("[api] /messages POST failed:", err);
    return false;
  }
}

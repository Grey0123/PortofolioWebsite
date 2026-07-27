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

// Category id is now a free string (the valid set lives in the DB, enforced
// by a foreign key) rather than a fixed union.
export type ApiCategory = {
  id: string;
  label: string;
  color: string;
  icon: string; // react-icons name, resolved via lib/icons.ts
};

export type ApiWork = {
  title: string;
  description: string;
  category: string;
  tech: string[];
  year: number;
  image?: string | null;
  href?: string | null;
  github?: string | null;
  featured?: boolean;
  // URL segment for /projects/[slug]. In the LIST payload because every card
  // needs it to build its link.
  slug: string;
};

export type ApiProjectImage = {
  // Either a path under /public ("/images/projects/foo.png") or a full URL.
  image_path: string;
  alt: string;
  caption?: string | null;
};

/**
 * The richer shape returned by GET /works/{slug}. Mirrors ProjectDetail in
 * api/schemas.py, which subclasses Work — so we extend ApiWork here for the
 * same reason: the two can't drift apart on the shared fields.
 */
export type ApiProjectDetail = ApiWork & {
  body_md?: string | null;
  role?: string | null;
  timeframe?: string | null;
  outcome?: string | null;
  images: ApiProjectImage[];
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

export type ApiCandidPhoto = {
  image_path: string;
  alt: string;
  // CSS object-position for the square crop (e.g. "30% center"). Optional.
  position?: string | null;
};

export type ApiPlace = {
  image_path: string;
  place: string;
  caption: string;
  // Tailwind grid placement string for the bento layout. Optional.
  span?: string | null;
};

export type ApiContentBundle = {
  rotating_roles: ApiRotatingRole[];
  categories: ApiCategory[];
  stats: ApiStat[];
  skills: ApiSkill[];
  experience: ApiTimelineItem[];
  education: ApiTimelineItem[];
  services: ApiService[];
  contact_info: ApiContactInfo | null;
  social_links: ApiSocialLink[];
  orbit_services: ApiOrbitService[];
  candid_photos: ApiCandidPhoto[];
  places: ApiPlace[];
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

/**
 * Fetch one project by slug for /projects/[slug].
 *
 * Returns `null` when the project doesn't exist, so the page can call Next's
 * `notFound()`. This deliberately does NOT use `getJson`: that helper folds
 * every failure into the same fallback value, and here we need to tell two
 * very different failures apart —
 *
 *   404  → the slug is genuinely wrong. Render the not-found page.
 *   502  → FastAPI or Supabase is having a bad day. The project probably
 *          exists; we just can't see it right now.
 *
 * Both currently return null (there's no good "try again later" page yet),
 * but they're logged differently so a real outage doesn't look like a typo
 * in your logs. If you later add an error boundary, this is where you'd
 * `throw` on the 502 branch to trigger it.
 */
export async function fetchProject(
  slug: string,
): Promise<ApiProjectDetail | null> {
  try {
    const res = await fetch(
      // encodeURIComponent guards against a slug with characters that would
      // otherwise change the URL's meaning. Our slugs are [a-z0-9-] so this
      // is belt-and-braces — but the day someone hand-edits a slug in the
      // dashboard and types a space, this is what stops a broken request.
      `${API_BASE}/works/${encodeURIComponent(slug)}`,
      { next: { revalidate: REVALIDATE_SECONDS } },
    );

    if (res.status === 404) return null;

    if (!res.ok) {
      console.error(`[api] /works/${slug} returned ${res.status}`);
      return null;
    }

    return (await res.json()) as ApiProjectDetail;
  } catch (err) {
    console.error(`[api] /works/${slug} fetch failed:`, err);
    return null;
  }
}

const EMPTY_BUNDLE: ApiContentBundle = {
  rotating_roles: [],
  categories: [],
  stats: [],
  skills: [],
  experience: [],
  education: [],
  services: [],
  contact_info: null,
  social_links: [],
  orbit_services: [],
  candid_photos: [],
  places: [],
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
// (categories are part of ApiContentBundle above)

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
 * Returns `null` ONLY when the project genuinely doesn't exist (404), so the
 * page can call `notFound()`. Every other failure THROWS.
 *
 * Why throwing is the right call here — a story worth remembering:
 *
 * The first deploy of this feature shipped the frontend to Vercel while the
 * backend on Render was still running older code without the /works/{slug}
 * route. FastAPI answered "404 Not Found" for a route it didn't have. The
 * original version of this function treated every failure the same way and
 * returned null, so the page rendered a friendly "No such project" — for
 * FIVE projects that all existed perfectly well in the database. A deployment
 * problem wearing the costume of a typo'd URL.
 *
 * Silently degrading is right when the data is genuinely optional (see
 * `getJson`, which powers sections that can render empty). It is wrong when
 * the fallback is a *lie about reality*. A 502 means "I can't tell you
 * whether this project exists" — answering "it doesn't" is worse than
 * admitting the failure, because nobody ever investigates a 404.
 *
 * The cost of this choice: a backend outage now shows an error page for
 * project URLs instead of a soft 404. That's the intended trade. The error
 * boundary in app/projects/[slug]/error.tsx renders it politely.
 */
export async function fetchProject(
  slug: string,
): Promise<ApiProjectDetail | null> {
  let res: Response;

  try {
    res = await fetch(
      // encodeURIComponent guards against a slug with characters that would
      // otherwise change the URL's meaning. Our slugs are [a-z0-9-] so this
      // is belt-and-braces — but the day someone hand-edits a slug in the
      // dashboard and types a space, this is what stops a broken request.
      `${API_BASE}/works/${encodeURIComponent(slug)}`,
      { next: { revalidate: REVALIDATE_SECONDS } },
    );
  } catch (err) {
    // Network-level failure: DNS, connection refused, TLS. The backend isn't
    // answering at all. Wrapping rather than rethrowing keeps the original
    // error as `cause` while adding the context that matters (which URL).
    throw new Error(
      `[api] cannot reach ${API_BASE} for /works/${slug}. Is the backend deployed and awake?`,
      { cause: err },
    );
  }

  if (res.status === 404) {
    // Two different things produce a 404 here and they mean opposite things:
    //
    //   {"detail":"No project with slug 'foo'"}  ← OUR handler. The route
    //       exists, the row doesn't. A genuinely missing project.
    //   {"detail":"Not Found"}                   ← FastAPI's default for an
    //       UNREGISTERED ROUTE. The backend is out of date and doesn't have
    //       GET /works/{slug} at all.
    //
    // We can't act on the difference (both are "no project to show"), but we
    // log the body so the distinction is visible in the Vercel function logs
    // instead of invisible. A bare "Not Found" in those logs means: redeploy
    // the backend, don't go hunting for a typo.
    const detail = await res.text().catch(() => "<unreadable body>");
    console.error(`[api] /works/${slug} → 404. Response body: ${detail}`);
    return null;
  }

  if (!res.ok) {
    // 5xx from Render's edge (commonly 502 while a sleeping free-tier
    // instance wakes up), or any other non-OK status.
    throw new Error(
      `[api] /works/${slug} returned ${res.status} ${res.statusText}. ` +
        `The project may exist — the backend just couldn't answer.`,
    );
  }

  return (await res.json()) as ApiProjectDetail;
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

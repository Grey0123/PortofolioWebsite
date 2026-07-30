/**
 * GitHub repository metadata for /projects/[slug].
 *
 * The project detail page is designed to look like a repo page: star and
 * fork counts, a language bar, a root file listing, the latest commit. All
 * of that is REAL data, pulled from GitHub's public REST API on the server
 * during the ISR render — not hand-typed into the database.
 *
 * WHY LIVE DATA RATHER THAN DB COLUMNS
 * ------------------------------------
 * The alternative was a set of jsonb columns on `works` that you'd fill in
 * by hand. That approach has one fatal property: it is wrong the moment you
 * push a commit. A portfolio that claims "126 commits · updated 3 days ago"
 * six months after you last touched it is worse than showing nothing,
 * because a technical reader WILL open the repo and notice. Live data can't
 * go stale; the cost is a network dependency, which the fallbacks below
 * contain.
 *
 * FAILURE POSTURE — the important design decision in this file
 * -----------------------------------------------------------
 * Every function here returns `null` (or an empty array) on failure and
 * NEVER throws. That's the opposite of the rule in lib/api.ts, where
 * `fetchProject` deliberately throws rather than lie about a project not
 * existing. The difference is what the data MEANS:
 *
 *   - A missing project is a lie about reality → throw, surface the outage.
 *   - A missing star count is a cosmetic gap → degrade, show the page.
 *
 * GitHub being rate-limited must never take down a page whose actual
 * content lives in your own database. So: no throws, and the page renders
 * the repo panels only when this module hands back real data.
 *
 * RATE LIMITS
 * -----------
 * Unauthenticated requests are capped at 60/hour PER IP. That sounds tight,
 * but two things keep us well under it:
 *
 *   1. `revalidate: 3600` on every request below (not the site-wide 60s).
 *      Star counts don't change by the minute, and Next caches the fetch
 *      result itself — so a page re-rendering every 60s still only hits
 *      GitHub once an hour.
 *   2. The per-file commit enrichment (the expensive part — one request per
 *      file) is gated behind a GITHUB_TOKEN. Without a token we simply omit
 *      those two columns rather than burn the budget.
 *
 * Setting GITHUB_TOKEN (a fine-grained PAT with public-repo read access, no
 * write scopes) raises the ceiling to 5,000/hour and switches the per-file
 * commit messages on. It is entirely optional — the page is complete
 * without it.
 *
 * NOTE: GITHUB_TOKEN has NO `NEXT_PUBLIC_` prefix, on purpose. This module
 * is imported only by Server Components, so the token stays on the server.
 * Adding that prefix would ship your PAT to every visitor's browser.
 */

/* ==================================================================
 * Types
 * ================================================================== */

export type RepoLanguage = {
  name: string;
  /** Percentage of bytes, rounded so the set sums to ~100. */
  pct: number;
  /** Hex colour, from the Linguist palette below. */
  color: string;
};

export type RepoFile = {
  name: string;
  /** "dir" | "file" — drives which icon the row gets. */
  type: "dir" | "file";
  /** True for README/markdown files, which get the accent-coloured icon. */
  isDoc: boolean;
  /** Link straight to the file/folder on GitHub. */
  url: string;
  /** Last commit subject for this path. Null unless GITHUB_TOKEN is set. */
  message: string | null;
  /** Relative time of that commit ("3 days ago"). Null without a token. */
  time: string | null;
};

/**
 * One week of commit activity. GitHub's /stats/commit_activity returns
 * exactly 52 of these — a rolling year — which is what powers the activity
 * strip under the language bar.
 */
export type RepoWeek = {
  /** ISO date of the week's start (Sunday), e.g. "2026-01-04". */
  weekStart: string;
  /** Commits landed that week. */
  total: number;
  /** Commits per day, Sunday → Saturday. */
  days: number[];
};

export type RepoCommit = {
  /** Short SHA, e.g. "a3f9c1e". */
  sha: string;
  message: string;
  author: string;
  avatar: string | null;
  url: string;
  time: string;
};

export type RepoMeta = {
  owner: string;
  repo: string;
  url: string;
  description: string | null;
  homepage: string | null;
  isPrivate: boolean;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  /** Repo size in KB, as GitHub reports it. */
  sizeKb: number;
  license: string | null;
  defaultBranch: string;
  topics: string[];
  /** Relative time since the last push ("3 days ago"). */
  updated: string;
  languages: RepoLanguage[];
  files: RepoFile[];
  latestCommit: RepoCommit | null;
  /** Total commits on the default branch. Null if it couldn't be derived. */
  commitCount: number | null;
  /** Rolling 52 weeks of commit activity. Empty when unavailable. */
  activity: RepoWeek[];
};

/* ==================================================================
 * Config
 * ================================================================== */

const GH_API = "https://api.github.com";

// One hour. Deliberately much longer than the 60s used for our own API:
// this is third-party data that barely moves, and a long window is what
// keeps us inside the unauthenticated rate limit. See the header comment.
const GH_REVALIDATE = 3600;

// Cap on how many root entries we show and (with a token) enrich. GitHub
// repos can have 50+ files at the root; a list that long turns the page
// into a directory browser instead of a portfolio.
const MAX_FILES = 12;

/**
 * Linguist's official language colours — the same values that produce the
 * coloured dots on a real GitHub repo page. Only the languages likely to
 * appear in these projects are listed; anything else falls through to the
 * deterministic hash palette in `colorFor`, so an unlisted language still
 * gets a stable colour rather than a blank swatch.
 */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Shell: "#89e051",
  Dockerfile: "#384d54",
  "Jupyter Notebook": "#DA5B0B",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  Go: "#00ADD8",
  Rust: "#dea584",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  PHP: "#4F5D95",
  Ruby: "#701516",
  SQL: "#e38c00",
  PLpgSQL: "#336790",
  "PL/SQL": "#dad8d8",
  TSQL: "#e38c00",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Astro: "#ff5a03",
  Makefile: "#427819",
  Batchfile: "#C1F12E",
  PowerShell: "#012456",
  Lua: "#000080",
  Dart: "#00B4AB",
  R: "#198CE7",
  MDX: "#fcb32c",
  Markdown: "#083fa1",
  Nix: "#7e7eff",
};

/** Stable fallback palette for languages missing from the map above. */
const FALLBACK_COLORS = [
  "#ff004f",
  "#00b7ff",
  "#a78bfa",
  "#ff7a1a",
  "#43b02a",
  "#ff30ff",
  "#ffd166",
];

function colorFor(language: string): string {
  const known = LANGUAGE_COLORS[language];
  if (known) return known;

  // Hash the name into the fallback palette. Using a hash rather than the
  // array index means a language keeps the SAME colour even if the order
  // of the languages response changes between renders — otherwise the
  // language bar would visibly reshuffle its colours on every revalidate.
  let hash = 0;
  for (let i = 0; i < language.length; i += 1) {
    hash = (hash * 31 + language.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

/* ==================================================================
 * Small helpers
 * ================================================================== */

/**
 * Pull {owner, repo} out of a GitHub URL.
 *
 * Tolerant on purpose — the value comes from a text column you edit by
 * hand in the Supabase dashboard, so it might arrive with a trailing
 * slash, a ".git" suffix, or a deep path like /tree/main/src. Returns null
 * for anything that isn't a GitHub repo URL (including gists), which is the
 * signal the page uses to hide the repo panels entirely.
 */
export function parseRepoUrl(
  raw: string | null | undefined,
): { owner: string; repo: string } | null {
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (!/(^|\.)github\.com$/i.test(url.hostname)) return null;

    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;

    return { owner, repo: repo.replace(/\.git$/i, "") };
  } catch {
    // Not a parseable URL at all (e.g. someone typed "Grey0123/ChineseApp").
    // Accept that shorthand too rather than losing the panels over a slash.
    const match = /^([\w.-]+)\/([\w.-]+)$/.exec(raw.trim());
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace(/\.git$/i, "") };
  }
}

/**
 * "3 days ago" style formatting.
 *
 * Uses Intl.RelativeTimeFormat rather than a hand-rolled ladder of if
 * statements so the output is properly localised and pluralised for free.
 *
 * IMPORTANT: this runs on the SERVER at render time, so the string is baked
 * into the cached HTML. With a 1-hour revalidate the worst-case drift is an
 * hour, which is invisible at "days ago" granularity. If this were ever
 * rendered client-side it would risk a hydration mismatch (server clock vs
 * browser clock), which is exactly the class of bug that makes people
 * distrust relative timestamps.
 */
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(seconds);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];

  for (const [unit, size] of units) {
    if (abs >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

/** Trim a commit message to its subject line (everything before the body). */
function commitSubject(message: string): string {
  return message.split("\n")[0].trim();
}

/* ==================================================================
 * The fetch wrapper
 * ================================================================== */

function headers(): HeadersInit {
  const h: HeadersInit = {
    // Pinning the API version means GitHub can't change a response shape
    // under us without our opting in.
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    // GitHub asks every client to identify itself; unidentified traffic is
    // the first thing they throttle.
    "User-Agent": "nabilgaharu-portfolio",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;

  return h;
}

/** True when a token is configured — gates the expensive per-file lookups. */
function hasToken(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

/**
 * One GitHub GET. Returns `{ data, res }` on success and null on ANY
 * failure, having already logged enough to diagnose it from the Vercel
 * function logs.
 *
 * The 403/429 branch is worth calling out: GitHub signals rate limiting
 * with a 403 (not a 401), and the remaining-quota header is the only way to
 * tell "you're throttled" apart from "that repo is private". Logging the
 * difference is what stops a future you from spending an afternoon
 * wondering why the language bar vanished.
 */
async function ghGet<T>(
  path: string,
): Promise<{ data: T; res: Response } | null> {
  try {
    const res = await fetch(`${GH_API}${path}`, {
      headers: headers(),
      next: { revalidate: GH_REVALIDATE },
    });

    if (!res.ok) {
      const remaining = res.headers.get("x-ratelimit-remaining");

      if ((res.status === 403 || res.status === 429) && remaining === "0") {
        const reset = res.headers.get("x-ratelimit-reset");
        const resetAt = reset
          ? new Date(Number(reset) * 1000).toISOString()
          : "unknown";
        console.warn(
          `[github] rate limited on ${path}. Quota resets at ${resetAt}. ` +
            "Set GITHUB_TOKEN to raise the limit from 60/hr to 5,000/hr.",
        );
      } else if (res.status === 404) {
        // Also what a PRIVATE repo returns to an unauthorised caller —
        // GitHub deliberately doesn't confirm private repos exist.
        console.warn(
          `[github] ${path} → 404 (repo missing, renamed, or private).`,
        );
      } else {
        console.warn(`[github] ${path} → ${res.status} ${res.statusText}`);
      }
      return null;
    }

    return { data: (await res.json()) as T, res };
  } catch (err) {
    console.warn(`[github] ${path} fetch failed:`, err);
    return null;
  }
}

/* ==================================================================
 * Pieces
 * ================================================================== */

type GhRepo = {
  html_url: string;
  description: string | null;
  homepage: string | null;
  private: boolean;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  subscribers_count?: number;
  watchers_count: number;
  size: number;
  default_branch: string;
  pushed_at: string;
  topics?: string[];
  license: { spdx_id: string | null; name: string } | null;
};

type GhContent = {
  name: string;
  type: "dir" | "file" | "symlink" | "submodule";
  html_url: string | null;
};

type GhWeek = {
  /** Unix seconds for the start of the week (Sunday). */
  week: number;
  total: number;
  days: number[];
};

type GhCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
  author: { login: string; avatar_url: string } | null;
};

/**
 * Convert the languages payload (bytes per language) into rounded
 * percentages that sum to 100.
 *
 * The rounding matters more than it looks. Rounding each share
 * independently gives you bars that total 99% or 101% — which shows up as a
 * visible gap or overflow at the end of a flex bar. The largest-remainder
 * pass below hands the leftover points to whichever languages lost the most
 * to rounding, so the bar always fills exactly.
 */
function toLanguages(raw: Record<string, number>): RepoLanguage[] {
  const entries = Object.entries(raw).filter(([, bytes]) => bytes > 0);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (total === 0) return [];

  const exact = entries
    .map(([name, bytes]) => ({ name, exact: (bytes / total) * 100 }))
    .sort((a, b) => b.exact - a.exact);

  const floored = exact.map((e) => ({ ...e, pct: Math.floor(e.exact) }));
  let leftover = 100 - floored.reduce((sum, e) => sum + e.pct, 0);

  // Hand out the leftover whole points, biggest fractional remainder first.
  [...floored]
    .sort((a, b) => (b.exact - b.pct) - (a.exact - a.pct))
    .forEach((e) => {
      if (leftover > 0) {
        e.pct += 1;
        leftover -= 1;
      }
    });

  return floored
    .filter((e) => e.pct > 0)
    .map((e) => ({ name: e.name, pct: e.pct, color: colorFor(e.name) }));
}

/**
 * Total commits on the default branch.
 *
 * GitHub has no "commit count" field. The standard trick: ask for ONE
 * commit per page, then read the `Link` header's rel="last" URL — its
 * `page` parameter IS the commit count, because with per_page=1 the last
 * page number equals the number of commits.
 *
 * The header is absent when there's only one page (i.e. one commit), which
 * is why the fallback returns 1 rather than null.
 */
function commitCountFrom(res: Response): number | null {
  const link = res.headers.get("link");
  if (!link) return 1;

  const last = /<([^>]+)>;\s*rel="last"/.exec(link);
  if (!last) return 1;

  try {
    const page = new URL(last[1]).searchParams.get("page");
    return page ? Number(page) : null;
  } catch {
    return null;
  }
}

/**
 * Normalise /stats/commit_activity into our own week shape.
 *
 * One quirk worth knowing about GitHub's statistics endpoints: the FIRST
 * request for a repo whose stats aren't cached returns **202 Accepted with
 * an empty body** while GitHub computes them in the background. That's a
 * 2xx, so `ghGet` treats it as success and hands us `{}` or `[]` — hence
 * the Array.isArray guard. On a later render (after the 1-hour revalidate)
 * the real data is there. So a brand-new repo may show no activity strip
 * for one cache window, then start working on its own. That's expected, not
 * a bug to chase.
 */
function toWeeks(raw: unknown): RepoWeek[] {
  if (!Array.isArray(raw)) return [];

  return (raw as GhWeek[])
    .filter((w) => typeof w?.week === "number")
    .map((w) => ({
      weekStart: new Date(w.week * 1000).toISOString().slice(0, 10),
      total: w.total ?? 0,
      days: Array.isArray(w.days) ? w.days : [],
    }));
}

/**
 * Attach each file's last commit subject + time.
 *
 * This is the only genuinely expensive part of the module: GitHub's
 * contents API doesn't include commit info, so learning "who last touched
 * README.md and when" costs one request PER PATH. For a 12-entry root
 * listing that's 12 requests on top of the 4 we already make.
 *
 * With the unauthenticated 60/hour budget that is not affordable, so we
 * skip it entirely unless GITHUB_TOKEN is set. The file list still renders
 * — it just shows names and icons, and the message/time columns collapse.
 * Degrading a column beats degrading the page.
 */
async function enrichFiles(
  owner: string,
  repo: string,
  files: RepoFile[],
): Promise<RepoFile[]> {
  if (!hasToken() || files.length === 0) return files;

  // Promise.all, not a loop with await: these are independent requests and
  // running them sequentially would turn 12 round-trips into 12 × latency.
  return Promise.all(
    files.map(async (file) => {
      const result = await ghGet<GhCommit[]>(
        `/repos/${owner}/${repo}/commits?per_page=1&path=${encodeURIComponent(file.name)}`,
      );

      const commit = result?.data?.[0];
      if (!commit) return file;

      return {
        ...file,
        message: commitSubject(commit.commit.message),
        time: commit.commit.author?.date
          ? relativeTime(commit.commit.author.date)
          : null,
      };
    }),
  );
}

/* ==================================================================
 * Public entry point
 * ================================================================== */

/**
 * Everything the project page needs about a repo, or null if there's
 * nothing to show.
 *
 * Null happens for three reasons and the page treats them identically:
 * the project has no `github` value, the URL doesn't parse, or GitHub
 * wouldn't answer. In all three cases the repo panels are simply not
 * rendered — see the "degrade gracefully" note in the page component.
 */
export async function fetchRepoMeta(
  githubUrl: string | null | undefined,
): Promise<RepoMeta | null> {
  const parsed = parseRepoUrl(githubUrl);
  if (!parsed) return null;

  const { owner, repo } = parsed;
  const base = `/repos/${owner}/${repo}`;

  // Four independent requests, fired together. Awaiting them in sequence
  // would stack four round-trips (~800ms) into the render for no reason —
  // none of them depends on another's result.
  const [repoRes, langRes, filesRes, commitRes, activityRes] =
    await Promise.all([
      ghGet<GhRepo>(base),
      ghGet<Record<string, number>>(`${base}/languages`),
      ghGet<GhContent[]>(`${base}/contents`),
      ghGet<GhCommit[]>(`${base}/commits?per_page=1`),
      ghGet<GhWeek[]>(`${base}/stats/commit_activity`),
    ]);

  // The repo call is the only one that's load-bearing. If it failed there's
  // no header, no license, no star count — nothing worth rendering a panel
  // for, so bail and let the page hide the whole section. The other three
  // are allowed to fail individually.
  if (!repoRes) return null;

  const r = repoRes.data;

  const languages = langRes ? toLanguages(langRes.data) : [];

  const files: RepoFile[] = (filesRes?.data ?? [])
    // Sort directories first, then alphabetically — the same ordering
    // GitHub itself uses, so the list looks familiar rather than arbitrary.
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, MAX_FILES)
    .map((f) => ({
      name: f.name,
      type: f.type === "dir" ? "dir" : "file",
      isDoc: /\.(md|mdx|rst|txt)$/i.test(f.name),
      url: f.html_url ?? `${r.html_url}/blob/${r.default_branch}/${f.name}`,
      message: null,
      time: null,
    }));

  const head = commitRes?.data?.[0] ?? null;

  const latestCommit: RepoCommit | null = head
    ? {
        sha: head.sha.slice(0, 7),
        message: commitSubject(head.commit.message),
        author: head.author?.login ?? head.commit.author?.name ?? "unknown",
        avatar: head.author?.avatar_url ?? null,
        url: head.html_url,
        time: head.commit.author?.date
          ? relativeTime(head.commit.author.date)
          : "",
      }
    : null;

  return {
    owner,
    repo,
    url: r.html_url,
    description: r.description,
    homepage: r.homepage || null,
    isPrivate: r.private,
    stars: r.stargazers_count,
    forks: r.forks_count,
    openIssues: r.open_issues_count,
    watchers: r.subscribers_count ?? r.watchers_count,
    sizeKb: r.size,
    // spdx_id is "NOASSERTION" for a licence GitHub can't identify, which
    // is noise — treat it as no licence rather than printing it.
    license:
      r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION"
        ? r.license.spdx_id
        : null,
    defaultBranch: r.default_branch,
    topics: r.topics ?? [],
    updated: relativeTime(r.pushed_at),
    languages,
    files: await enrichFiles(owner, repo, files),
    latestCommit,
    commitCount: commitRes ? commitCountFrom(commitRes.res) : null,
    activity: toWeeks(activityRes?.data),
  };
}

// Project detail page — /projects/[slug]
//
// This is a DYNAMIC ROUTE. The folder name `[slug]` in square brackets tells
// Next.js that this segment is a variable: /projects/mangalens and
// /projects/aml-reporting-system both render this one file, with the matched
// value handed to us as `params.slug`.
//
// It is a Server Component (note: no "use client"). It runs on the server,
// awaits its own data, and ships HTML. The ONLY client-side JavaScript on
// this page is components/project/ProjectTabs.tsx — see the note there about
// pushing "use client" to the smallest possible leaf.
//
// ── LAYOUT ────────────────────────────────────────────────────────────
// Modelled on a GitHub repo page, per the design mockup:
//
//   sticky nav ─ back link, brand, GitHub + demo buttons
//   hero ────── repo breadcrumb, category chip, title, summary, topics,
//               hero screenshot, aurora glow
//   language bar + commit activity
//   tabs ────── Code · Screenshots · README
//   two columns ─ main content | sidebar (About, Context, Metrics)
//   footer
//
// ── WHERE THE DATA COMES FROM ─────────────────────────────────────────
// Two independent sources, and knowing which is which explains most of the
// conditional rendering below:
//
//   Supabase (via FastAPI) — title, description, category, tech, year,
//       role/timeframe/outcome, body_md, gallery images. This is YOUR
//       content and it always exists.
//   GitHub API (lib/github.ts) — stars, forks, languages, file listing,
//       latest commit, commit activity. This is third-party and may be
//       absent for three separate reasons: the project has no repo, the
//       repo is private, or GitHub rate-limited us.
//
// Everything sourced from GitHub is therefore behind a `repo &&` guard. A
// project with no repo (three of the five, currently) renders the same page
// minus those panels — no empty boxes, no "N/A", no placeholder zeros. That
// is deliberate: an empty bordered card reads as broken, while its absence
// reads as "this project doesn't have one", which is the truth.

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FaArrowLeft, FaGithub, FaStar } from "react-icons/fa";

import ProjectBody from "@/components/ProjectBody";
import ProjectScreenshots from "@/components/project/ProjectScreenshots";
import ProjectTabs, { type ProjectTab } from "@/components/project/ProjectTabs";
import RepoActivity from "@/components/project/RepoActivity";
import RepoFileList from "@/components/project/RepoFileList";
import RepoLanguageBar from "@/components/project/RepoLanguageBar";
import {
  MetaRow,
  SidebarCard,
  StatRow,
} from "@/components/project/SidebarCard";
import { fetchContent, fetchProject, fetchWorks } from "@/lib/api";
import { fetchRepoMeta } from "@/lib/github";
import { getCategory, toCategory } from "@/lib/works";

// Same 60s ISR window as every other route. After 60 seconds the next request
// triggers a background re-render, so editing a project in the Supabase
// dashboard shows up within a minute — no redeploy.
//
// The GitHub fetches inside this render use their own, much longer window
// (1 hour, set per-fetch in lib/github.ts). Per-fetch revalidate overrides
// the page default, which is exactly what we want: your own content stays
// fresh at 60s without hammering a rate-limited third-party API.
export const revalidate = 60;

/* ==================================================================
 * generateStaticParams — prerender one page per project at build time
 * ================================================================== */
/**
 * Next calls this at BUILD time and statically generates a page for every
 * slug it returns. The payoff: a visitor hitting /projects/mangalens gets a
 * file that already exists rather than waiting on a FastAPI round-trip —
 * which matters here because Render's free tier sleeps after 15 minutes and
 * takes 30–60s to wake (see CLAUDE.md gotchas).
 *
 * What about a project you add to Supabase AFTER the build? Next's
 * `dynamicParams` defaults to `true`, so an unknown slug is rendered on
 * demand on first request and then cached like the rest. You get the speed
 * of static without the "must redeploy to publish" tax. (Setting
 * `dynamicParams = false` would instead 404 anything not in this list.)
 */
export async function generateStaticParams() {
  const works = await fetchWorks();

  // fetchWorks swallows failures and returns [] — deliberately, so a sleeping
  // backend can't fail the whole build. But that silence has already cost us
  // once: the first deploy of this feature hit a 502 here (Render was asleep,
  // Vercel waited 35s, gave up) and prerendered ZERO project pages. The build
  // reported success; the pages just quietly became on-demand and took a
  // cold-start minute to load.
  //
  // So: keep the tolerance, lose the silence. This warning is visible in the
  // Vercel build log, right where you'd be looking.
  if (works.length === 0) {
    console.warn(
      "\n[projects] generateStaticParams got 0 works — NO project pages will " +
        "be prerendered.\n  Usual cause: the backend was unreachable or asleep " +
        "during the build (look for a '/works returned 5xx' line above).\n  " +
        "The pages still work, but render on demand. Redeploy once the backend " +
        "is awake to restore static generation.\n",
    );
  }

  // Guard against a slug-less payload. If the BACKEND is out of date, its
  // Pydantic `Work` model has no `slug` field and response_model strips the
  // column out — so every entry here would be `{ slug: undefined }`, and Next
  // would try to prerender "/projects/undefined". Filtering keeps a stale
  // backend from generating garbage routes.
  const withSlugs = works.filter((w) => Boolean(w.slug));

  if (withSlugs.length < works.length) {
    console.warn(
      `\n[projects] ${works.length - withSlugs.length} of ${works.length} works ` +
        "came back with no slug. The backend is almost certainly running code " +
        "from before the project-detail migration — redeploy it.\n",
    );
  }

  return withSlugs.map((w) => ({ slug: w.slug }));
}

/* ==================================================================
 * generateMetadata — per-project <title> and link previews
 * ================================================================== */
/**
 * Runs per page, on the server, before render. Whatever it returns is merged
 * over the metadata in app/layout.tsx — so `title` here slots into that
 * file's `template: "%s | Nabil Gaharu"` automatically.
 *
 * Why this is worth the effort: when a recruiter pastes a project link into
 * Slack or LinkedIn, THIS is what unfurls. A card showing the project name,
 * its one-line summary, and a screenshot is a different first impression
 * from a bare URL.
 *
 * Note the duplicate fetchProject call — this function and the page component
 * below both ask for the same project. Next dedupes identical fetch requests
 * within a single render pass, so this costs one network call, not two.
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const project = await fetchProject(params.slug);

  if (!project) {
    return { title: "Project not found" };
  }

  return {
    title: project.title,
    description: project.description,
    openGraph: {
      title: project.title,
      description: project.description,
      type: "article",
      // Fall back to the site-wide OG image when a project has no hero shot,
      // so the preview card is never blank.
      images: [{ url: project.image ?? "/images/profile.png" }],
    },
  };
}

/* ==================================================================
 * The page
 * ================================================================== */
export default async function ProjectPage({
  params,
}: {
  params: { slug: string };
}) {
  // Promise.all runs both fetches concurrently. Awaiting them one after the
  // other would serialize two independent network calls for no reason — the
  // categories don't depend on the project. This is the single most common
  // easy win in async Server Components.
  const [project, content] = await Promise.all([
    fetchProject(params.slug),
    fetchContent(),
  ]);

  // fetchProject returns null on a 404 from FastAPI. notFound() throws a
  // special error that Next catches, rendering the nearest not-found UI AND
  // sending a real 404 status code — which is what stops search engines from
  // indexing a dead URL as if it were a real page.
  if (!project) notFound();

  // This one CAN'T join the Promise.all above: it needs `project.github`,
  // which only exists after the first fetch resolves. A genuine data
  // dependency, not an oversight — worth distinguishing from the accidental
  // sequential awaits that Promise.all exists to fix.
  //
  // fetchRepoMeta never throws (see the failure-posture note in
  // lib/github.ts), so there's no try/catch here by design: GitHub being
  // down must not take out a page whose real content is in Supabase.
  const repo = await fetchRepoMeta(project.github);

  const categories = content.categories.map(toCategory);
  const category = getCategory(project.category, categories);

  // Topics = your curated tech list, plus any GitHub topic you've set on the
  // repo that isn't already covered. `tech` leads because you chose it; the
  // toLowerCase comparison stops "Next.js" and "nextjs" appearing twice.
  const seen = new Set(project.tech.map((t) => t.toLowerCase()));
  const topics = [
    ...project.tech,
    ...(repo?.topics ?? []).filter((t) => !seen.has(t.toLowerCase())),
  ];

  // Only render the context card if at least one field is filled — otherwise
  // it'd be a bordered box with a heading and nothing under it.
  const hasContext = Boolean(project.role || project.timeframe || project.outcome);

  // Live-demo URL: prefer the one you set in Supabase, fall back to the
  // repo's homepage field if GitHub has one.
  const demoUrl = project.href ?? repo?.homepage ?? null;
  const demoLabel = demoUrl
    ? demoUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : null;

  /* ---- tabs ------------------------------------------------------
   * Built from what actually exists rather than hard-coded to three.
   * A project with no repo and no screenshots gets a single README tab,
   * which the tab bar renders as a plain section heading rather than a
   * one-option control that implies there's something to switch to. */
  const tabs: ProjectTab[] = [];

  if (repo && repo.files.length > 0) {
    tabs.push({
      id: "code",
      label: "Code",
      icon: "code",
      content: <RepoFileList repo={repo} />,
    });
  }

  if (project.images.length > 0) {
    tabs.push({
      id: "screenshots",
      label: "Screenshots",
      count: project.images.length,
      content: (
        <div>
          {/* The mockup carries a section heading above the grid even though
              the tab is already labelled. Kept, because the tab bar scrolls
              horizontally on a narrow screen — the active label can end up
              off-screen, and then this is the only thing telling you what
              you're looking at. */}
          <div className="mb-3.5 flex items-baseline gap-3">
            <h2 className="text-base font-semibold text-white">Screenshots</h2>
            <span className="font-mono text-[11.5px] text-white/40">
              {project.images.length} image
              {project.images.length === 1 ? "" : "s"}
            </span>
          </div>
          <ProjectScreenshots images={project.images} title={project.title} />
        </div>
      ),
    });
  }

  tabs.push({
    id: "readme",
    label: "README",
    content: (
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.012]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.025] px-5 py-3">
          <span className="flex items-center gap-2.5 text-[13.5px] font-semibold text-white">
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="#9a9aa3"
              strokeWidth="1.2"
              aria-hidden="true"
            >
              <path d="M9 1.75H3.75c-.55 0-1 .45-1 1v10.5c0 .55.45 1 1 1h8.5c.55 0 1-.45 1-1V5.5L9 1.75Z" />
              <path d="M9 1.75V5.5h4" />
            </svg>
            README.md
          </span>
          {/* The mockup shows a static "Raw · Blame" caption here. Since we
              know the owner, repo, and default branch, these can be the real
              GitHub URLs instead of decoration — the element stays, it just
              does something. Omitted entirely when there's no repo, rather
              than rendering two dead links. */}
          {repo && (
            <span className="flex items-center gap-2 font-mono text-[11.5px] text-white/40">
              <a
                href={`https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.defaultBranch}/README.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white/80"
              >
                Raw
              </a>
              <span aria-hidden="true">·</span>
              <a
                href={`${repo.url}/blame/${repo.defaultBranch}/README.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white/80"
              >
                Blame
              </a>
            </span>
          )}
        </div>
        <div className="px-6 py-7 sm:px-8">
          {/* `body_md` is authored in the Supabase dashboard — see
              docs/WRITING-PROJECTS.md. Null is a normal state, not an error:
              a project can go live with just its summary while the long-form
              write-up is still being written. */}
          {project.body_md ? (
            <ProjectBody markdown={project.body_md} />
          ) : (
            <p className="text-sm text-white/40">Write-up coming soon.</p>
          )}
        </div>
      </div>
    ),
  });

  return (
    <main className="relative overflow-clip">
      {/* ================= NAVBAR ================= */}
      {/* Sticky, not fixed. `sticky top-0` keeps the bar in normal document
          flow, so the content below starts under it automatically. `fixed`
          removes it from flow and requires a matching padding-top on the
          content — a number that silently breaks the moment the bar's height
          changes. Sticky is the lower-maintenance choice. */}
      <nav className="sticky top-0 z-[100] border-b border-white/[0.07] bg-ink/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-3 sm:px-7">
          <div className="flex items-center gap-3.5">
            <Link
              href="/#portfolio"
              className="inline-flex items-center gap-2 font-mono text-[12.5px] text-white/55 transition-colors hover:text-white"
            >
              <FaArrowLeft className="text-[10px] text-accent" />
              <span className="hidden sm:inline">All projects</span>
            </Link>

            <span className="h-[18px] w-px bg-white/[0.12]" aria-hidden="true" />

            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/images/ng-logo.png"
                alt=""
                width={30}
                height={30}
                className="h-[30px] w-[30px] rounded-lg"
                priority
              />
              <span className="text-sm font-semibold text-white">
                Nabil Gaharu
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                // noopener: stops the opened page from reaching back through
                // window.opener. noreferrer: withholds the Referer header.
                // Always pair these with target="_blank" on external links.
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.16] bg-white/[0.04] px-3.5 py-2 text-[13px] font-medium text-white/90 transition-colors hover:border-white/35"
              >
                <FaGithub className="text-sm" />
                <span className="hidden sm:inline">GitHub</span>
                <span aria-hidden="true">&nearr;</span>
              </a>
            )}
            {demoUrl && (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-[0_0_26px_rgba(255,0,79,0.34)] transition-transform hover:-translate-y-px"
              >
                Live demo <span aria-hidden="true">&nearr;</span>
              </a>
            )}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-[1200px] px-5 sm:px-7">
        {/* ================= HERO ================= */}
        <section className="relative overflow-hidden py-10 sm:py-12">
          {/* Aurora wash. `pointer-events-none` matters: without it this
              invisible blurred ellipse sits on top of the hero and eats
              clicks on the links underneath.
              `motion-safe:` respects prefers-reduced-motion — a large slow
              drift is exactly the kind of ambient movement that triggers
              discomfort for people with vestibular sensitivity, and it costs
              one modifier to honour that. */}
          <div
            className="pointer-events-none absolute -left-[14%] -top-1/2 h-[190%] w-[44%] rounded-full opacity-[0.26] blur-[110px] motion-safe:animate-auroraDrift"
            style={{
              background:
                "radial-gradient(circle, #ff004f 0%, transparent 65%)",
            }}
            aria-hidden="true"
          />

          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              {/* ---- repo breadcrumb strip ---- */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs text-white/40">
                {repo ? (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="#8a8a99"
                        aria-hidden="true"
                      >
                        <path d="M2 2.75A1.75 1.75 0 0 1 3.75 1h8.5A1.75 1.75 0 0 1 14 2.75v10.5A1.75 1.75 0 0 1 12.25 15H4a2 2 0 0 1-2-2V2.75Zm2 9.75h8.5v-9.5H4v9Z" />
                      </svg>
                      {repo.owner} / <span className="text-white/75">{repo.repo}</span>
                    </span>

                    <span className="rounded-full border border-white/[0.16] px-2.5 py-0.5 text-white/55">
                      {repo.isPrivate ? "Private" : "Public"}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[#f7c948]">&#9733;</span>
                      {repo.stars}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true">&#10547;</span>
                      {repo.forks}
                    </span>
                  </>
                ) : (
                  // No repo — show the category as the breadcrumb instead, so
                  // this line still carries information rather than vanishing
                  // and shifting everything below it up.
                  <span className="inline-flex items-center gap-1.5">
                    <category.Icon
                      className="text-[13px]"
                      style={{ color: category.color }}
                    />
                    {category.label}
                  </span>
                )}
              </div>

              {/* ---- category + year ---- */}
              <div className="mt-[18px] flex flex-wrap items-center gap-3">
                <span
                  className="rounded-full px-3 py-[5px] font-mono text-[11px] uppercase tracking-[0.1em] text-white"
                  // Category colours are DB values, so they can't be Tailwind
                  // classes — Tailwind only generates CSS for class strings it
                  // can see literally in the source at build time.
                  style={{ backgroundColor: category.color }}
                >
                  {category.label}
                </span>

                <span className="font-mono text-xs text-white/40">
                  {project.year}
                </span>

                {project.featured && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-[5px] font-mono text-[11px] uppercase tracking-[0.1em] text-accent">
                    <FaStar className="text-[9px]" /> Featured
                  </span>
                )}
              </div>

              {/* ---- title ---- */}
              <h1 className="mt-4 text-[clamp(2rem,4.2vw,3.1rem)] font-bold leading-[1.04] tracking-[-0.03em] text-white">
                {project.title}
                {/* The serif full stop from the mockup. It's one character,
                    but swapping to an italic serif for it is the kind of
                    detail that reads as "designed" rather than "defaulted". */}
                <span className="font-serif italic text-accent">.</span>
              </h1>

              <p className="mt-[18px] max-w-[480px] text-base leading-[1.7] text-muted">
                {project.description}
              </p>

              {/* ---- topic chips ---- */}
              {topics.length > 0 && (
                <ul className="mt-[22px] flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <li
                      key={topic}
                      className="rounded-full border border-[#00b7ff]/30 bg-[#00b7ff]/[0.08] px-[11px] py-1 font-mono text-[11.5px] text-[#79c0ff]"
                    >
                      {topic}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ---- hero image ---- */}
            {project.image ? (
              <div className="relative z-[1] h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] sm:h-[330px]">
                <Image
                  src={project.image}
                  alt={`${project.title} screenshot`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              // Placeholder rather than nothing: on a two-column grid an
              // absent second child would let the text column stretch to full
              // width, which looks like a different page template. A quiet
              // dashed frame keeps the composition and reads as "no shot yet".
              <div
                className="relative z-[1] hidden h-[330px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] lg:flex"
                aria-hidden="true"
              >
                <span className="font-mono text-xs text-white/20">
                  No screenshot yet
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ================= LANGUAGE BAR + ACTIVITY ================= */}
        {repo && (repo.languages.length > 0 || repo.activity.length > 0) && (
          <section className="grid gap-7 border-t border-white/[0.06] py-6 lg:grid-cols-[1fr_320px]">
            <RepoLanguageBar languages={repo.languages} />
            <RepoActivity weeks={repo.activity} />
          </section>
        )}

        {/* ================= MAIN + SIDEBAR ================= */}
        <div className="grid gap-7 pb-14 pt-4 lg:grid-cols-[minmax(0,1fr)_322px]">
          {/* `minmax(0,1fr)` on the main column, not `1fr`. A grid track
              defaults to `min-width:auto`, meaning it refuses to shrink below
              its content — so one long code line or an un-breakable string in
              the README would push the sidebar off-screen instead of
              scrolling inside its own container. */}
          <div className="min-w-0">
            <ProjectTabs tabs={tabs} />
          </div>

          {/* ---- sidebar ---- */}
          <aside className="flex min-w-0 flex-col gap-[18px]">
            <SidebarCard title="About">
              <p className="mt-3 text-sm leading-[1.65] text-white/70">
                {project.description}
              </p>

              {(demoUrl || project.github) && (
                <div className="mt-4 flex flex-col gap-2.5">
                  {demoUrl && (
                    <a
                      href={demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-[13.5px] text-[#79c0ff] hover:underline"
                    >
                      <span className="text-accent" aria-hidden="true">
                        &nearr;
                      </span>
                      <span className="truncate">{demoLabel}</span>
                    </a>
                  )}
                  {project.github && (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-[13.5px] text-white/75 hover:underline"
                    >
                      <FaGithub className="shrink-0 text-[15px]" />
                      View source on GitHub
                    </a>
                  )}
                </div>
              )}

              {/* Fact strip. Every row is conditional — a project with no repo
                  shows just Category and Year, which is honest and tidy. */}
              <dl className="mt-[18px] flex flex-col gap-2.5 border-t border-white/[0.08] pt-4 font-mono text-xs text-white/50">
                <FactRow label="Category" value={category.label} />
                {repo?.license && <FactRow label="License" value={repo.license} />}
                {repo?.languages[0] && (
                  <FactRow label="Language" value={repo.languages[0].name} />
                )}
                <FactRow label="Year" value={String(project.year)} />
                {repo && <FactRow label="Updated" value={repo.updated} />}
              </dl>
            </SidebarCard>

            {/* Role / Timeframe / Outcome. Not in the mockup — kept from the
                previous version of this page because it answers the question
                a hiring manager actually has ("what did YOU do?"), which
                nothing else here does. */}
            {hasContext && (
              <SidebarCard title="Context">
                <dl className="mt-3.5 flex flex-col gap-3.5">
                  <MetaRow label="Role" value={project.role} />
                  <MetaRow label="Timeframe" value={project.timeframe} />
                  <MetaRow label="Outcome" value={project.outcome} />
                </dl>
              </SidebarCard>
            )}

            {repo && (
              <SidebarCard title="Project metrics">
                <dl className="mt-3.5 flex flex-col">
                  {repo.commitCount !== null && (
                    <StatRow
                      label="Commits"
                      value={repo.commitCount.toLocaleString()}
                    />
                  )}
                  <StatRow label="Stars" value={String(repo.stars)} />
                  <StatRow label="Forks" value={String(repo.forks)} />
                  <StatRow label="Open issues" value={String(repo.openIssues)} />
                  {repo.languages.length > 0 && (
                    <StatRow
                      label="Languages"
                      value={String(repo.languages.length)}
                    />
                  )}
                  <StatRow label="Repo size" value={formatSize(repo.sizeKb)} />
                </dl>
              </SidebarCard>
            )}
          </aside>
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-5 font-mono text-xs text-white/40 sm:px-7">
          <span>
            © {new Date().getFullYear()} Nabil Ananta Satria Gaharu
          </span>
          <Link
            href="/#portfolio"
            className="inline-flex items-center gap-2 transition-colors hover:text-white/70"
          >
            <FaArrowLeft className="text-[10px] text-accent" />
            Back to all projects
          </Link>
        </div>
      </footer>
    </main>
  );
}

/* ==================================================================
 * Local helpers
 * ================================================================== */

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt>{label} ·</dt>
      <dd className="text-white/75">{value}</dd>
    </div>
  );
}

/** GitHub reports repo size in KB; show MB once it stops being readable. */
function formatSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

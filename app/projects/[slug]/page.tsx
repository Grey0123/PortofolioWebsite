// Project detail page — /projects/[slug]
//
// This is a DYNAMIC ROUTE. The folder name `[slug]` in square brackets tells
// Next.js that this segment is a variable: /projects/mangalens and
// /projects/aml-reporting-system both render this one file, with the matched
// value handed to us as `params.slug`.
//
// It is a Server Component (note: no "use client" at the top). It runs on the
// server, awaits its own data, and ships plain HTML to the browser. Nothing
// here is interactive yet, so nothing needs to be a Client Component — which
// means zero JavaScript for this page beyond Next's own runtime.
//
// STATUS: skeleton (build steps 1–4 of docs/ROADMAP.md). Header, summary,
// context, tech, and links are done. Still to come: markdown body rendering
// (react-markdown), the image gallery + lightbox, and the architecture
// diagram / code-snippet blocks described in TODO.md item 7.

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FaArrowLeft, FaExternalLinkAlt, FaGithub, FaStar } from "react-icons/fa";

import ProjectBody from "@/components/ProjectBody";
import { fetchContent, fetchProject, fetchWorks } from "@/lib/api";
import { getCategory, toCategory } from "@/lib/works";

// Same 60s ISR window as every other route. After 60 seconds the next request
// triggers a background re-render, so editing a project in the Supabase
// dashboard shows up within a minute — no redeploy.
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

  const categories = content.categories.map(toCategory);
  const category = getCategory(project.category, categories);

  // Any of the three context fields may be empty; only render the strip if
  // at least one has a value, otherwise we'd draw an empty bordered box.
  const context = [
    { label: "Role", value: project.role },
    { label: "Timeframe", value: project.timeframe },
    { label: "Outcome", value: project.outcome },
  ].filter((item) => Boolean(item.value));

  return (
    <main className="relative overflow-clip">
      {/* Minimal top bar rather than the site <Navbar>. Navbar's links are all
          same-page hash anchors ("#about"), which on this route would resolve
          to /projects/<slug>#about and go nowhere. Making Navbar route-aware
          (prefix hrefs with "/" when not on the home page) is a worthwhile
          follow-up; this back link keeps the skeleton honest until then. */}
      <div className="fixed inset-x-0 top-0 z-[100] border-b border-white/10 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 md:px-[10%]">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/ng-logo.png"
              alt="NG logo"
              width={44}
              height={44}
              priority
            />
          </Link>
          <Link
            href="/#portfolio"
            className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-accent"
          >
            <FaArrowLeft className="text-xs" />
            Back to work
          </Link>
        </div>
      </div>

      <article className="relative mx-auto max-w-[900px] px-6 pb-24 pt-32 md:px-8">
        {/* ---- Header ------------------------------------------------- */}
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white"
              style={{ borderColor: `${category.color}55` }}
            >
              {/* Rendering a react-icons component INSIDE a Server Component is
                  fine — it just emits SVG. The rule in CLAUDE.md is about
                  PASSING the component as a prop to a Client Component, which
                  fails because functions aren't JSON-serializable. */}
              <category.Icon className="text-[11px]" style={{ color: category.color }} />
              {category.label}
            </span>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
              {project.year}
            </span>

            {project.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/90 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white">
                <FaStar className="text-[10px]" /> Featured
              </span>
            )}
          </div>

          <h1 className="mt-6 text-4xl font-semibold leading-tight md:text-6xl">
            {project.title}
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            {project.description}
          </p>
        </header>

        {/* ---- Context strip (role / timeframe / outcome) -------------- */}
        {context.length > 0 && (
          <dl className="mt-10 grid gap-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:grid-cols-3">
            {context.map((item) => (
              <div key={item.label}>
                <dt className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                  {item.label}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-white/85">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/* ---- Hero image --------------------------------------------- */}
        {project.image && (
          <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-2xl border border-white/10">
            <Image
              src={project.image}
              alt={`${project.title} screenshot`}
              fill
              // `sizes` tells next/image how wide this will actually render so
              // it can pick the right source width. Without it, Next assumes
              // 100vw and serves a needlessly large file on desktop.
              sizes="(max-width: 900px) 100vw, 900px"
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* ---- Tech ---------------------------------------------------- */}
        {project.tech.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/40">
              Built with
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tech.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[12px] text-white/70"
                >
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ---- Write-up ------------------------------------------------ */}
        {/* `body_md` is authored in the Supabase dashboard — see
            docs/WRITING-PROJECTS.md. Null is a normal state, not an error: a
            project can go live with just its summary while the long-form
            write-up is still being written. */}
        <section className="mt-12 border-t border-white/5 pt-10">
          {project.body_md ? (
            <ProjectBody markdown={project.body_md} />
          ) : (
            <p className="text-sm text-white/40">Write-up coming soon.</p>
          )}
        </section>

        {/* ---- External links ------------------------------------------ */}
        {(project.href || project.github) && (
          <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-white/5 pt-8">
            {project.href && (
              <a
                href={project.href}
                target="_blank"
                // noopener: stops the opened page from reaching back through
                // window.opener. noreferrer: withholds the Referer header.
                // Always pair these with target="_blank" on external links.
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <FaExternalLinkAlt className="text-xs" />
                Live site
              </a>
            )}
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/80 transition-colors hover:border-white/40 hover:text-white"
              >
                <FaGithub className="text-sm" />
                Source
              </a>
            )}
          </div>
        )}

        {/* ---- Back ---------------------------------------------------- */}
        <div className="mt-14">
          <Link
            href="/#portfolio"
            className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-accent"
          >
            <FaArrowLeft className="text-xs" />
            Back to all work
          </Link>
        </div>
      </article>
    </main>
  );
}

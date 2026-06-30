# ROADMAP — planned features

Forward-looking work, written down so it can be picked up later. Each entry
is a **plan**, not yet built. When someone asks "what's next," start here.

Status legend: `PLANNED` (designed, not started) · `IN PROGRESS` · `DONE`.

---

## 1. Dedicated project detail page — `PLANNED`

### Goal

Today the portfolio is a single page: each project is a card in the grid
(`components/PortfolioClient.tsx`) showing title, description, tech chips,
and Live/Code links. There's nowhere to tell the *story* of a project.

This feature adds a **dedicated page per project** — e.g.
`/projects/web-scraping-telegram-bot` — that can hold:

- A proper write-up of **how it works** (architecture, decisions, results).
- An **image gallery** (screenshots / diagrams), ideally with a lightbox.
- **Download buttons** (a case-study PDF, a sample dataset, an asset zip,
  the resume, etc.).
- Rich metadata for nice link previews when shared (Open Graph tags).

Clicking a portfolio card navigates to this page; a "← Back to work" link
returns to the grid.

### Why this is a good fit for the stack (and for learning)

It exercises exactly the Next.js App Router concepts worth knowing next:
**dynamic routes** (`app/projects/[slug]/page.tsx`), **`generateStaticParams`**
(pre-render one static page per project at build time), **`generateMetadata`**
(per-page SEO/OG tags), and **`notFound()`**. On the data side it introduces
**Supabase Storage** (for images and downloadable files) and **markdown
rendering** — both common real-world skills. Nothing here breaks the existing
three-tier rule: the page is a Server Component that fetches through FastAPI,
which remains the only thing touching Supabase.

### Architecture decisions (confirm before building)

These are the forks that change the work. Defaults are recommended; revisit
when we start.

1. **Page vs modal.** → **Full route** (`/projects/[slug]`). A real URL is
   shareable, SEO-able, and back-button friendly. (A modal can't be linked.)
2. **"How it works" content format.** → **Markdown stored in the DB**,
   rendered with `react-markdown`. Flexible, easy to edit from the Supabase
   dashboard, no redeploy to change copy. Alternative: a structured
   `project_sections` table (more rigid, more UI work). Start with markdown.
3. **Where images/files live.** → **Supabase Storage bucket**
   (`project-assets`). Keeps everything in one place and editable without a
   redeploy. Alternative: drop files in `/public` (simplest, but means a
   commit + deploy per image). Use Storage.
4. **Download URLs: public vs signed.** → **Public bucket + public URLs**
   for a portfolio (the files are meant to be seen). If anything should be
   gated later, switch that bucket to private and have FastAPI mint signed
   URLs. Note: a cross-origin `<a download>` won't force a download via the
   `download` attribute alone; to force "Save as" we either set the object's
   `Content-Disposition` in Storage or proxy the file through a FastAPI
   route. Decide per-asset.

### Data model changes

Add to the existing `works` table (additive migration — see the categories
migration as the template for "drop nothing, add columns"):

- `slug text UNIQUE` — the URL segment. Backfill from existing titles
  (`lower`, spaces→`-`, strip punctuation). The portfolio cards currently
  key on `title`; switch links to `slug`.
- `body_md text` — the long-form "how it works" markdown (nullable; page
  renders a sensible empty state when absent).
- Optional context fields, all nullable: `role`, `timeframe`, `outcome`.

Two new tables (same RLS pattern as everything else — `ENABLE ROW LEVEL
SECURITY` + public-read `SELECT` policy, writes only via service-role):

- `project_images` — `id`, `work_id` (FK → works, `ON DELETE CASCADE`),
  `image_path` (Storage URL or path), `alt`, `caption` (nullable),
  `sort_order`.
- `project_downloads` — `id`, `work_id` (FK → works, `ON DELETE CASCADE`),
  `label`, `file_url`, `kind` (e.g. `pdf`/`zip`/`csv`), `size_bytes`
  (nullable), `sort_order`.

### API changes (FastAPI)

- Keep `GET /works` lean — it's the list for the grid. Add **`slug`** to the
  `Work` schema so cards can build links, but do **not** add `body_md` /
  images / downloads to the list payload (keep it small).
- New **`GET /works/{slug}`** returning a richer `ProjectDetail`: the work
  fields plus `images: list[ProjectImage]` and `downloads:
  list[ProjectDownload]` and `body_md`. New Pydantic schemas: `ProjectImage`,
  `ProjectDownload`, `ProjectDetail`. New router method in
  `api/routers/works.py` (or a dedicated `projects.py`).
- 404 when the slug doesn't exist, so the frontend can call Next's
  `notFound()`.

### Frontend changes (Next.js)

- `lib/api.ts`: add `fetchProject(slug)` + wire types (`ApiProjectImage`,
  `ApiProjectDownload`, `ApiProjectDetail`). Add `slug` to `ApiWork`.
- `app/projects/[slug]/page.tsx` — Server Component:
  - `generateStaticParams()` → fetch `/works`, return one `{ slug }` per
    project so each detail page is statically generated (with the same
    `revalidate` ISR window as the rest of the site).
  - `generateMetadata()` → title/description/OG image from the project.
  - Fetch the project; if missing, `notFound()`.
  - Compose sections: header (title, category chip via `getCategory`, year,
    featured), summary, markdown body, gallery, downloads, external links,
    back link.
- New presentational components (Client only where interactivity is needed,
  e.g. the lightbox): `ProjectGallery` (lightbox), `DownloadList`,
  `ProjectBody` (markdown). **Remember the boundary rule:** resolve icon
  *names* to components inside Client Components, never pass an `Icon`
  function across the server→client boundary (see `CLAUDE.md` gotchas).
- `PortfolioClient.tsx`: wrap each card in a `<Link href={`/projects/${slug}`}>`
  (keep the Live/Code buttons as separate links; stop the card link from
  swallowing their clicks).

### Suggested build order (small, shippable steps)

1. **DB migration** — add `works.slug` (+ backfill), `body_md`, optional
   context cols; create `project_images` and `project_downloads` with RLS;
   create the `project-assets` Storage bucket. Apply via a new
   `supabase/migrations/<date>_project_detail.sql` (don't edit old ones).
2. **API** — `slug` on `Work`; `ProjectDetail` schema + `GET /works/{slug}`.
   Verify in `/docs`.
3. **Frontend data** — `fetchProject` + types in `lib/api.ts`.
4. **Route skeleton** — `app/projects/[slug]/page.tsx` with
   `generateStaticParams`, `notFound()`, and just the header + summary.
5. **Link the grid** — cards navigate to the new pages.
6. **Content blocks** — markdown body, then gallery, then downloads.
7. **Polish** — `generateMetadata`/OG tags, lightbox, animations,
   accessibility (alt text, focus states, keyboard nav).

Each step is independently testable and leaves the site working.

### Effort / risk

Medium. The riskiest/new bits are Supabase Storage wiring and the markdown
renderer (sanitize untrusted HTML if `body_md` ever comes from anywhere but
you — here it's you, so low risk). Everything else mirrors patterns already
in the repo.

### Open questions to settle when we start

- Which downloadable assets do you actually want (case-study PDF? dataset?
  asset zip?) — drives the `project_downloads` shape and whether we need
  forced-download handling.
- Do you want the gallery images hand-curated per project, or is one hero
  image enough for v1?
- Markdown now, or hold and ship with just summary + gallery first?

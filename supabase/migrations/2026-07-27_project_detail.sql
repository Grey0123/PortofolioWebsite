-- =========================================================================
-- Migration: project detail pages  (/projects/[slug])
-- Date: 2026-07-27
-- =========================================================================
-- BEFORE: a project existed only as a card in the grid — title, blurb, tech
--         chips, Live/Code links. There was nowhere to tell its story.
--
-- AFTER:  each work gets a stable URL segment (`slug`), a long-form markdown
--         body, three short context fields, and an ordered list of gallery
--         images in a child table.
--
-- This file is ADDITIVE and idempotent — safe to run more than once against
-- the live database. It drops nothing. Per CLAUDE.md, migrations already run
-- in prod are never hand-edited; a correction goes in a NEW file.
--
-- Apply it: Supabase Dashboard → SQL Editor → paste → Run.
-- =========================================================================


-- 1. New columns on `works` ------------------------------------------------
--
--    WHY `slug` is a separate column instead of deriving the URL from the
--    title at render time: the title is editable copy. The moment you retitle
--    "AML Reporting System" to something punchier, every link anyone ever
--    shared would 404. A slug is a deliberate, stable identifier that you
--    change only when you mean to.
--
--    It is nullable for now on purpose — step 2 backfills it, and step 3 adds
--    the UNIQUE index. Adding `NOT NULL` up front would fail against the five
--    existing rows, which is the classic reason additive migrations run
--    add → backfill → constrain rather than all at once.
ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS slug       text,
  -- The long-form write-up, authored as markdown and rendered with
  -- react-markdown on the frontend. Nullable: a project with no write-up yet
  -- still gets a page, it just renders an empty state instead of a body.
  ADD COLUMN IF NOT EXISTS body_md    text,
  -- Three short context fields shown in the page header. All nullable so a
  -- half-filled project degrades gracefully rather than rendering "null".
  ADD COLUMN IF NOT EXISTS role       text,   -- e.g. "Solo build" / "Data analyst, team of 4"
  ADD COLUMN IF NOT EXISTS timeframe  text,   -- e.g. "Mar–May 2024 · 6 weeks"
  ADD COLUMN IF NOT EXISTS outcome    text;   -- one-line result, e.g. "Cut manual triage 4h/wk → 20min"


-- 2. Backfill `slug` from `title` -----------------------------------------
--
--    The transformation, innermost-first:
--      lower(title)                     "Web Scraping + Telegram Bot"
--        → '[^a-z0-9]+' → '-'           "web-scraping-telegram-bot"
--        → trim leading/trailing '-'    (handles titles that start or end
--                                        with punctuation)
--
--    `WHERE slug IS NULL` is what makes this re-runnable: rows you have since
--    hand-edited keep the slug you gave them. It also means this statement is
--    a no-op on the second run rather than silently reverting your edits.
UPDATE public.works
SET slug = trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL;


-- 3. Constrain: unique, and required --------------------------------------
--
--    A UNIQUE INDEX rather than a UNIQUE CONSTRAINT so `IF NOT EXISTS` works
--    (Postgres has no `ADD CONSTRAINT IF NOT EXISTS`). Functionally identical
--    for our purposes — both reject a duplicate slug.
--
--    If this line errors with "could not create unique index", two of your
--    titles normalize to the same slug. Fix by editing one row's slug by hand,
--    then re-run.
CREATE UNIQUE INDEX IF NOT EXISTS works_slug_key ON public.works (slug);

--    Now that every row has a value, make it required. Guarded so a re-run
--    doesn't error on an already-NOT NULL column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'works'
      AND column_name = 'slug' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.works ALTER COLUMN slug SET NOT NULL;
  END IF;
END $$;


-- 4. `project_images` — the per-project gallery ---------------------------
--
--    WHY a child table instead of a text[] column on works: each image needs
--    its own alt text, optional caption, and explicit order. An array of
--    paths would force all three into a naming convention or a parallel
--    array — both of which rot. A row per image is the boring, correct shape.
--
--    `image_path` holds a path under /public, e.g.
--    "/images/projects/mangalens/dashboard.png" — the same convention already
--    used by candid_photos and places. It is deliberately typed as free text
--    so a value starting with "https://" (a Supabase Storage URL, say) also
--    works if you later outgrow committing images to the repo. The frontend
--    treats a leading "/" as local and anything else as remote, so switching
--    an individual image is a data change, not a code change.
--
--    ON DELETE CASCADE: deleting a work should take its gallery with it.
--    Orphaned image rows pointing at a project that no longer exists are pure
--    liability — nothing would ever read them, and they'd break any future
--    "list all images" query.
CREATE TABLE IF NOT EXISTS public.project_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id    uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  alt        text NOT NULL,          -- required: an image with no alt is a bug
  caption    text,                   -- optional visible caption under the image
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

--    Index the FK. Postgres indexes the primary key automatically but NOT the
--    referencing side of a foreign key, and every gallery lookup is
--    "WHERE work_id = ...". Cheap now, saves a sequential scan later.
CREATE INDEX IF NOT EXISTS project_images_work_id_idx
  ON public.project_images (work_id, sort_order);

--    Same RLS pattern as every other table in this schema: row level security
--    ON, a public-read SELECT policy for anon + authenticated, and NO write
--    policy. Writes are therefore possible only via the service-role key,
--    which lives exclusively in FastAPI. See CLAUDE.md rule 5.
ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_images_public_read" ON public.project_images;
CREATE POLICY "project_images_public_read"
  ON public.project_images
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- 5. Verify ----------------------------------------------------------------
--    Run this after the migration; every row should show a sensible slug.
--
--      SELECT title, slug FROM public.works ORDER BY year DESC;
--
--    Expected for the current five rows:
--      MangaLens                          → mangalens
--      ChineseApp                         → chineseapp
--      Multi-Platform Product Comparison  → multi-platform-product-comparison
--      Web Scraping + Telegram Bot        → web-scraping-telegram-bot
--      AML Reporting System               → aml-reporting-system
--
--    Any of those you dislike, just UPDATE by hand — the slug is yours to
--    choose, the backfill only provides a starting point. Do it BEFORE you
--    share links anywhere.

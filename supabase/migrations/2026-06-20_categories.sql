-- =========================================================================
-- Migration: make project categories editable (data-driven)
-- Date: 2026-06-20
-- =========================================================================
-- BEFORE: `works.category` was constrained by an inline CHECK listing five
--         fixed strings. Adding a category meant editing the CHECK, the
--         Pydantic Literal, and the lib/works.ts CATEGORIES array, then
--         redeploying.
--
-- AFTER:  categories live in their own table. `works.category` is now a
--         FOREIGN KEY into it. Adding a category = INSERT one row in the
--         Supabase dashboard; it shows up as a filter chip with no deploy.
--
-- WHY a FK instead of just dropping the CHECK?
--   The CHECK guaranteed you could never store a typo like "analyitcs".
--   Removing it without a replacement would let bad data in. A FK gives us
--   the SAME guarantee — Postgres rejects any works.category that isn't a
--   real categories.id — while letting the *set* of valid values be data,
--   not code. (TypeScript loses its compile-time union in exchange; the DB
--   becomes the single source of truth for "what is a valid category".)
--
-- This file is ADDITIVE and idempotent — safe to run on the live DB. It is
-- the migration of record. supabase/schema.sql is also updated so a brand
-- new database built from schema.sql ends up in this same shape.
-- =========================================================================


-- 1. The categories table -------------------------------------------------
--    `id` is the slug stored on works.category (e.g. "data"). We use a
--    human-readable text PK rather than a uuid so the FK column on works
--    stays the same readable slug it has always been — no data migration
--    of existing rows, and the dashboard editor shows "data" not a uuid.
--
--    `icon` holds a react-icons NAME (e.g. "FaDatabase"), resolved on the
--    frontend via lib/icons.ts — the exact same string→component pattern
--    already used by stats, services, and social_links. If you add a
--    category whose icon name isn't in that registry, the UI quietly falls
--    back to FaCode instead of crashing.
CREATE TABLE IF NOT EXISTS public.categories (
  id         text PRIMARY KEY,                 -- slug, also the FK target
  label      text NOT NULL,                    -- chip label, e.g. "Data Engineering"
  color      text NOT NULL,                    -- hex, drives chip + card glow
  icon       text NOT NULL,                    -- react-icons name, via lib/icons.ts
  sort_order integer NOT NULL DEFAULT 0,       -- chip display order
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- 2. Seed the five existing categories ------------------------------------
--    Values copied verbatim from the old lib/works.ts CATEGORIES array so
--    the live site looks identical after migrating. ON CONFLICT keeps this
--    re-runnable.
INSERT INTO public.categories (id, label, color, icon, sort_order) VALUES
  ('data',       'Data Engineering', '#00b7ff', 'FaDatabase',  1),
  ('automation', 'Automation',       '#ff30ff', 'FaRobot',     2),
  ('ai',         'AI / ML',          '#ffa94d', 'FaBrain',     3),
  ('analytics',  'Analytics',        '#9d7bff', 'FaChartLine', 4),
  ('web',        'Web',              '#ff004f', 'FaCode',      5)
ON CONFLICT (id) DO NOTHING;


-- 3. Swap the CHECK for a FOREIGN KEY -------------------------------------
--    Order matters: categories must be seeded (step 2) BEFORE we add the FK,
--    or existing works rows ('data', 'automation') would violate it.
--    DROP ... IF EXISTS and the guarded ADD make this safe to re-run.
ALTER TABLE public.works DROP CONSTRAINT IF EXISTS works_category_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'works_category_fkey'
  ) THEN
    ALTER TABLE public.works
      ADD CONSTRAINT works_category_fkey
      FOREIGN KEY (category) REFERENCES public.categories(id)
      ON UPDATE CASCADE      -- rename a category id and works follow it
      ON DELETE RESTRICT;    -- block deleting a category that still has works
  END IF;
END $$;

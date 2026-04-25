-- =========================================================================
-- Portfolio Website — Supabase schema
-- =========================================================================
-- Paste this whole file into the Supabase SQL editor (Dashboard → SQL →
-- New query → paste → Run) to create every table + RLS policy in one go.
-- Safe to re-run — every statement uses IF NOT EXISTS / DROP POLICY IF EXISTS
-- so there's no error on replay.
--
-- After running schema.sql, run seed.sql (works) and seed_content.sql
-- (about/services/orbit/etc.) to populate the initial data.
--
-- ARCHITECTURE NOTE:
--   The Next.js frontend never talks to Supabase directly anymore. It calls
--   the FastAPI backend in /api, which uses the Supabase service-role key
--   to read/write on behalf of users. RLS is still enabled here as
--   defense-in-depth (and so the Supabase dashboard, which uses the anon
--   key in the table editor, behaves predictably).
-- =========================================================================


-- =========================================================================
-- PORTFOLIO PROJECTS
-- =========================================================================

-- -------------------------------------------------------------------------
-- Table: works
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (
    category IN ('data', 'automation', 'ai', 'web', 'analytics')
  ),
  tech text[] NOT NULL DEFAULT ARRAY[]::text[],
  year integer NOT NULL,
  image text,
  href text,
  github text,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "works_public_read" ON public.works;
CREATE POLICY "works_public_read"
  ON public.works
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- =========================================================================
-- CONTACT FORM SUBMISSIONS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_public_insert" ON public.messages;
CREATE POLICY "messages_public_insert"
  ON public.messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS messages_created_at_idx
  ON public.messages (created_at DESC);


-- =========================================================================
-- HERO: rotating roles ("I'm a Data Analyst / SET / …")
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.rotating_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rotating_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rotating_roles_public_read" ON public.rotating_roles;
CREATE POLICY "rotating_roles_public_read"
  ON public.rotating_roles FOR SELECT TO anon, authenticated USING (true);


-- =========================================================================
-- HERO: stats strip ("Years in tech: 3+", "Based in: Indonesia", …)
--   `value_number` + `suffix` for counted numbers, `value_text` for text.
--   Exactly one of (value_number, value_text) should be set per row.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icon text NOT NULL,           -- icon name, resolved client-side via lib/icons.ts
  label text NOT NULL,
  value_number integer,
  value_text text,
  suffix text,                  -- e.g. "+" appended after value_number
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT stats_value_xor CHECK (
    (value_number IS NOT NULL) <> (value_text IS NOT NULL)
  )
);

ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stats_public_read" ON public.stats;
CREATE POLICY "stats_public_read"
  ON public.stats FOR SELECT TO anon, authenticated USING (true);


-- =========================================================================
-- ABOUT: skills tab
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  detail text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "skills_public_read" ON public.skills;
CREATE POLICY "skills_public_read"
  ON public.skills FOR SELECT TO anon, authenticated USING (true);


-- =========================================================================
-- ABOUT: timeline (experience + education share one table, distinguished
-- by `kind`). Avoids two near-identical tables and lets you reorder freely.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('experience', 'education')),
  period text NOT NULL,
  title text NOT NULL,
  org text NOT NULL,
  detail text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timeline_public_read" ON public.timeline;
CREATE POLICY "timeline_public_read"
  ON public.timeline FOR SELECT TO anon, authenticated USING (true);


-- =========================================================================
-- SERVICES grid (the 6 cards: Data Analytics, AI, QA, Web Dev, …)
--   Tech is stored as text[] (same pattern as works.tech) — small enough
--   not to need a join table.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icon text NOT NULL,
  title text NOT NULL,
  tagline text NOT NULL,
  description text NOT NULL,
  color text NOT NULL,
  tech text[] NOT NULL DEFAULT ARRAY[]::text[],
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "services_public_read" ON public.services;
CREATE POLICY "services_public_read"
  ON public.services FOR SELECT TO anon, authenticated USING (true);


-- =========================================================================
-- CONTACT info (single-row table, but kept as a regular table so you can
-- update from the dashboard without code changes).
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.contact_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  cv_url text
);

ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_info_public_read" ON public.contact_info;
CREATE POLICY "contact_info_public_read"
  ON public.contact_info FOR SELECT TO anon, authenticated USING (true);


-- =========================================================================
-- CONTACT social links
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,       -- e.g. "Instagram"
  url text NOT NULL,
  icon text NOT NULL,           -- icon name, resolved via lib/icons.ts
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "social_links_public_read" ON public.social_links;
CREATE POLICY "social_links_public_read"
  ON public.social_links FOR SELECT TO anon, authenticated USING (true);


-- =========================================================================
-- ORBIT SERVICES (TechMarquee 3D hub) — services + their tools.
--   `orbit_tools.icon` is nullable: when null, the UI shows a 3-letter
--   abbreviation of the tool name instead.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.orbit_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  short_name text NOT NULL,
  tagline text NOT NULL,
  color text NOT NULL,
  icon text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.orbit_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orbit_services_public_read" ON public.orbit_services;
CREATE POLICY "orbit_services_public_read"
  ON public.orbit_services FOR SELECT TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS public.orbit_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orbit_service_id uuid NOT NULL REFERENCES public.orbit_services(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text,                    -- nullable; UI falls back to abbreviation
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS orbit_tools_service_idx
  ON public.orbit_tools (orbit_service_id, sort_order);

ALTER TABLE public.orbit_tools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orbit_tools_public_read" ON public.orbit_tools;
CREATE POLICY "orbit_tools_public_read"
  ON public.orbit_tools FOR SELECT TO anon, authenticated USING (true);

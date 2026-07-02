-- =========================================================================
-- Space-palette retune — 2026-07-02
--
-- The UI was reworked to a deep-space theme with ONE saturated accent
-- (#ff004f). The old per-row colors (neon cyan #00b7ff, magenta #ff30ff,
-- green #43b02a, orange #f89820, yellow #f7df1e...) were a full rainbow,
-- which is what made the page read as a generated template.
--
-- New rule: every color is either the pink accent, a rose tint of it, or
-- a cool indigo/violet/periwinkle — i.e. "shades of the same night sky".
-- Rows keep DIFFERENT colors so cards stay distinguishable; they just all
-- live in one family now.
--
-- Run in Supabase Dashboard → SQL editor. Idempotent (plain UPDATEs).
-- =========================================================================

-- ---------- services ----------
UPDATE public.services SET color = '#7a82e8' WHERE title = 'Data Analytics';          -- periwinkle
UPDATE public.services SET color = '#b06ce8' WHERE title = 'Artificial Intelligence'; -- violet
UPDATE public.services SET color = '#5a9de8' WHERE title = 'Quality Assurance';       -- soft blue
UPDATE public.services SET color = '#ff004f' WHERE title = 'Web Development';         -- accent
UPDATE public.services SET color = '#ff6b8f' WHERE title = 'App Development';         -- rose
UPDATE public.services SET color = '#9aa0e8' WHERE title = 'Game Development';        -- pale indigo

-- ---------- orbit_services (hero hub) ----------
UPDATE public.orbit_services SET color = '#7a82e8' WHERE slug = 'backend';
UPDATE public.orbit_services SET color = '#b06ce8' WHERE slug = 'ai';
UPDATE public.orbit_services SET color = '#5a9de8' WHERE slug = 'data';
UPDATE public.orbit_services SET color = '#ff6b8f' WHERE slug = 'scraping';
UPDATE public.orbit_services SET color = '#ff004f' WHERE slug = 'frontend';
UPDATE public.orbit_services SET color = '#9aa0e8' WHERE slug = 'api';
UPDATE public.orbit_services SET color = '#8a90e8' WHERE slug = 'infra';

-- ---------- categories (portfolio filter chips) ----------
UPDATE public.categories SET color = '#7a82e8' WHERE id = 'data';
UPDATE public.categories SET color = '#b06ce8' WHERE id = 'automation';
UPDATE public.categories SET color = '#ff6b8f' WHERE id = 'ai';
UPDATE public.categories SET color = '#9d7bff' WHERE id = 'analytics'; -- already violet, kept
UPDATE public.categories SET color = '#ff004f' WHERE id = 'web';

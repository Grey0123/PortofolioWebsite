-- =========================================================================
-- Seed data for the gallery tables (candid_photos + places).
--
-- Run this ONCE in the Supabase SQL editor, AFTER schema.sql has been
-- updated with the candid_photos + places tables. Safe to re-run only
-- after truncating the tables — the inserts below don't dedupe.
--
-- Why option B (paths under /public/images/...):
--   The image binaries stay in the repo and are served by the Vercel CDN
--   for free. The DB only stores metadata (alt, place, caption, span,
--   ordering). To migrate to Supabase Storage later, replace each
--   image_path with the storage URL and nothing else needs to change.
-- =========================================================================


-- ---------- ABOUT: candid carousel ----------
-- The first row is the formal portrait so the carousel still leads with it.
-- Each subsequent candid can pin its own focal point via `position`
-- (CSS object-position) so 16:9 crops to the right spot in the square frame.
INSERT INTO public.candid_photos (image_path, alt, position, sort_order) VALUES
  ('/images/profile.png',         'Nabil portrait',         NULL,           0),
  ('/images/candid/candid-1.png', 'Candid moment of Nabil', '30% center',   1);


-- ---------- TRAVEL: places bento grid ----------
-- The `span` column drives the bento layout. Mix-and-match these to taste:
--   • NULL                                → standard 1x1 tile
--   • 'md:col-span-2'                     → wide tile
--   • 'md:row-span-2'                     → tall tile
--   • 'md:col-span-2 md:row-span-2'       → big hero tile
INSERT INTO public.places (image_path, place, caption, span, sort_order) VALUES
  ('/images/background/place-1.jpg',  'A scene worth remembering', 'One of those views I keep coming back to.',  'md:col-span-2 md:row-span-2', 0),
  ('/images/background/place-2.jpg',  'A scene worth remembering', 'Quiet moment, captured in passing.',          NULL,                          1),
  ('/images/background/place-3.jpg',  'A scene worth remembering', 'A favorite frame from the trip.',             NULL,                          2),
  ('/images/background/place-4.jpg',  'A scene worth remembering', 'Light, shape, distance — all lined up.',      'md:col-span-2',               3),
  ('/images/background/place-5.jpg',  'A scene worth remembering', 'A pause in the middle of the day.',           NULL,                          4),
  ('/images/background/place-6.jpg',  'A scene worth remembering', 'The kind of view that resets you.',           'md:row-span-2',               5),
  ('/images/background/place-7.jpg',  'A scene worth remembering', 'Wandering somewhere new.',                    NULL,                          6),
  ('/images/background/place-8.jpg',  'A scene worth remembering', 'Ordinary day, extraordinary light.',          NULL,                          7),
  ('/images/background/place-9.jpg',  'A scene worth remembering', 'Another reason to keep exploring.',           'md:col-span-2',               8),
  ('/images/background/place-10.jpg', 'A scene worth remembering', 'Tucked away, easy to miss.',                  NULL,                          9);

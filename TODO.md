# TODO — de-"AI-ify" the portfolio (human tasks)

Things only Nabil can do well, in priority order. From the code review on 2026-07-02.

## 1. Rewrite copy with specifics (biggest impact)
- [ ] About bio: replace "continuous learning / diligence / thrive in collaboration" filler
      with named, concrete facts (e.g. what you actually built at Blibli & Cygnet Pericon).
- [ ] Service card descriptions: kill the identical "tagline + I build X — Y and Z" rhythm.
      One real example or outcome per card beats three adjectives.
- [ ] Write it in your own words first, even if messy. Don't let AI polish it back
      into the same cadence.
- Copy lives in `supabase/seed_content.sql` → tables `skills`, `services`, `timeline`.
  Update rows in Supabase dashboard (or a new SQL file — don't edit run migrations).

## 2. Cut services 6 → 3
- [ ] Keep: Data/Analytics, QA Automation, Web Development (work history proves them).
- [ ] Drop: Game Dev, App Dev (no supporting projects yet), consider merging AI in later.
- [ ] Trim orbit tools to ones you'd survive an interview question on
      (remove Binance API, Stripe, Godot, Flutter, Scrapy, etc. unless real).

## 3. Add project evidence
- [ ] Write case studies for existing 3 works: problem → what you did → result.
- [ ] Add 2–3 more works rows — the Telegram scraper bot and THIS portfolio site
      (Next.js + FastAPI + Supabase) both deserve entries.
- [ ] Add GitHub / live-demo links per project.
- [ ] Build `/projects/[slug]` detail pages (spec in docs/ROADMAP.md) — Claude can scaffold.

## 4. Fix the stats strip
- [ ] "12+ projects shipped" vs 3 shown = credibility leak. Reconcile, or replace
      vanity counters with concrete ones ("400+ automated test cases", "3 companies").
- Rows in `stats` table.

## 5. Quick fixes
- [ ] Delete Facebook/Twitter social links pointing to `#` (`social_links` table).
- [ ] Cut rotating roles 5 → 2-3 (`rotating_roles` table).
- [ ] Travel tiles: real place names + captions ("Bromo, East Java" beats poetry)
      (`places` table).

## 6. Visual restraint (Claude is reworking UI separately — see space-theme pass)
- [ ] Review the reworked visuals; keep ONE accent color dominant.
- [ ] Use the serif-italic flourish once, not in every headline.

## 7. Project detail page — design additions (agreed 2026-07-04)
Build plan lives in docs/ROADMAP.md + the four decisions from chat
(manual repo data in DB, /public images, markdown body, no downloads v1).
Design elements to include when built:
- [ ] Architecture diagram per project (theme-styled SVG, animated flow dots,
      category-colored nodes) — highest-value visual on the page.
- [ ] Code snippet block — one well-chosen ~15-line snippet per project,
      syntax-highlighted, mono filename header. (Nabil picks the snippets.)
- [ ] Per-project accent tinting from category color (chips, language bar, hero glow).
- [ ] "Problem → Approach → Result" skim strip above the long write-up.
- [ ] Write-up structure (Nabil writes): problem, what I built, 2–3 real
      trade-off decisions, results w/ numbers, what I'd do differently.

## 8. Black hole footer (Claude builds — greenlit)
- [ ] Port "Ascent" (1c) geometry + "Gargantua II" (2a) engine into the Contact
      section as a Client Component; realism pass (Doppler beaming, photon ring,
      temperature gradient, star lensing).
- [ ] Warp-into-nebula easter egg with realistic nebula (baked noise filaments,
      dust lanes, lit stars) + small return black hole as the way back; ESC fallback.
- [ ] IntersectionObserver pause, prefers-reduced-motion static frame, mobile
      particle cuts. Contact form/buttons must never be blocked by the canvas.
- [ ] Nebula content: NOTHING for v1 (Nabil undecided). Ideas parked: secret
      keyword line, maker's signature, drifting micro-facts.

# CLAUDE.md — Project context for AI assistants

This file is the canonical briefing for any AI assistant (Claude or
otherwise) working on this codebase. Read it before making changes.

---

## Who this is for

The owner — **Nabil**, based in Indonesia — is a data analyst / Software
Engineer in Test (Blibli, Cygnet Pericon background) using this project
to **learn modern web development**: Next.js App Router, TypeScript,
FastAPI, and the Supabase/Postgres ecosystem. He already knows
React/HTML/CSS/JS and SQL well.

**Implications for how to help:**
- Lean into explanation. When introducing a pattern (Server Component,
  ISR cache, RLS policy, dependency injection), explain *why* the
  pattern exists, not just the code.
- Annotate generated code with comments that teach. Comments should
  answer "why this approach" or "what could go wrong otherwise" rather
  than restate what the next line does.
- Frame trade-offs as "Option A vs B with consequences" so he can build
  judgment, not just follow instructions.
- Don't assume Python expertise (he's newer to it than to JS/SQL).

---

## What this project is

A personal portfolio website at `nabilgaharu.com` (or the Vercel URL
until DNS is set). Three-tier stack:

```
Next.js (Vercel) ──HTTP──▶ FastAPI (Render) ──pg──▶ Supabase (hosted Postgres)
```

The Next.js frontend renders the UI. The FastAPI backend is the only
thing that talks to Supabase — it owns the service-role key and
exposes a small typed REST surface. Supabase stores both the dynamic
content (services, projects, contact info, etc.) and contact-form
submissions.

The original site was hand-written HTML. The Next.js rewrite was the
first phase; moving hardcoded data into Supabase + adding the FastAPI
middleware was the second phase. Both are done.

---

## Tech stack

| Layer | Tool | Notes |
| --- | --- | --- |
| Framework | Next.js **14.2.15** App Router | Server Components fetch on the server; Client Components only for interactivity |
| Language | TypeScript (strict) | `tsconfig.json` paths alias `@/*` → repo root |
| Styling | Tailwind 3.4.13 | Custom tokens: `accent`, `magentaGlow`, `cyanGlow`, `ink`, `card`, `muted` |
| Animation | framer-motion 11.11.9 | Used heavily — orbit hub uses rAF + 3D CSS transforms, not framer per-frame |
| Icons | react-icons 5.3.0 | Resolved from string names via `lib/icons.ts` registry (DB stores names) |
| Backend | FastAPI 0.115 + uvicorn | Pinned to Python **3.12.7** on Render (3.14 lacks pydantic-core wheels) |
| Validation | Pydantic 2.9.2 + email-validator 2.2.0 | `EmailStr` requires email-validator — keep both pinned |
| DB client (Python) | supabase-py **>=2.15** | Older versions reject the new `sb_secret_…` key format |
| Database | Supabase (Postgres) | RLS enabled on every table; `TO anon, authenticated` scoping |

`@supabase/supabase-js` was removed from the frontend — all DB access
now goes through FastAPI.

---

## File map

```
PortofolioWebsite/
├── app/
│   ├── page.tsx              ← async Server Component; await fetchContent()
│   └── layout.tsx            ← uses next/font/google (Poppins)
├── components/
│   ├── Header.tsx            ← receives roles/stats/orbit as props
│   ├── About.tsx             ← skills/experience/education + CandidCarousel
│   ├── CandidCarousel.tsx    ← auto-rotating photo carousel above About copy
│   ├── Services.tsx          ← receives services list
│   ├── StatsStrip.tsx        ← receives stats list
│   ├── Contact.tsx           ← receives contact_info + social_links; POST /messages
│   ├── Portfolio.tsx         ← Server Component; fetches /works itself
│   ├── PortfolioClient.tsx   ← Client filter UI; AnimatePresence default mode
│   ├── TechMarquee.tsx       ← orbit hub (3D rAF loop); receives orbit_services
│   └── hero/RotatingRole.tsx ← receives roles
├── lib/
│   ├── api.ts                ← typed fetcher to FastAPI
│   ├── icons.ts              ← string→IconType registry
│   └── works.ts              ← Work view-model + categories + toWork()
├── supabase/
│   ├── schema.sql            ← every table + RLS policy (idempotent)
│   ├── seed.sql              ← initial works rows
│   └── seed_content.sql      ← initial about/services/orbit/contact/etc
├── api/
│   ├── main.py               ← FastAPI app + CORS
│   ├── db.py                 ← Supabase client (service-role, lru_cache)
│   ├── schemas.py            ← Pydantic request/response shapes
│   ├── routers/
│   │   ├── content.py        ← GET /content (the bundle)
│   │   ├── works.py          ← GET /works
│   │   └── messages.py       ← POST /messages
│   ├── requirements.txt
│   ├── runtime.txt           ← python-3.12.7 for Render
│   ├── .env.example
│   └── README.md
├── STEPS.md                  ← study guide / first-run walkthrough
└── CLAUDE.md                 ← this file
```

---

## Architectural rules

1. **Server Components fetch data, Client Components handle interaction.**
   Default to no `"use client"`. Add it only when the component needs
   `useState`, `useEffect`, event handlers, or browser APIs.

2. **All Supabase access goes through FastAPI.** The frontend has no
   Supabase client. Don't reintroduce one. If a new feature needs DB
   access, add a route in `api/routers/` and a fetcher in `lib/api.ts`.

3. **Icons live in the DB as strings.** When the schema or seed needs an
   icon, store the react-icons name (e.g. `"FaDatabase"`, `"SiPython"`).
   The frontend resolves it via `getIcon()` from `lib/icons.ts`. If a
   new icon is added to seed data, also add it to the registry — else
   the UI silently falls back to `FaCode`.

4. **Single page-level fetch.** `app/page.tsx` does ONE
   `await fetchContent()` and props-drills slices into each section.
   Don't move that fetch into individual components — that would
   multiply network round trips. (Portfolio is the one exception:
   it has its own fetch because `/works` is a separate, larger payload.)

5. **RLS is on for every table.** New tables get `ENABLE ROW LEVEL
   SECURITY` and a `CREATE POLICY ... TO anon, authenticated USING (true)`
   for public-read. Write policies are deliberately omitted — only
   service-role (FastAPI) can write.

6. **Pydantic schemas are the wire contract.** `api/schemas.py` shapes
   double as the OpenAPI `/docs` page AND the source of truth for
   `lib/api.ts` types. Keep them in sync.

---

## Local dev workflow

Two terminals:

```cmd
:: Terminal 1 — backend
cd api
.venv\Scripts\activate
uvicorn main:app --reload --port 8000

:: Terminal 2 — frontend
npm run dev
```

Then:
- <http://localhost:8000/docs> — Swagger UI
- <http://localhost:3000> — the site

Env vars:
- `.env.local` (frontend, git-ignored): `NEXT_PUBLIC_API_BASE_URL`,
  legacy Supabase vars
- `api/.env` (backend, git-ignored): `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGINS`

Templates committed: `.env.example` and `api/.env.example`. **Real
keys never go in `.example` files** — GitHub push protection has
already blocked one such accident.

---

## Deployment

- **Frontend → Vercel.** Auto-deploys on push to `main`. Env var:
  `NEXT_PUBLIC_API_BASE_URL` set to the Render service URL.
- **Backend → Render.** Singapore region. Root Directory `api`.
  Build: `pip install -r requirements.txt`. Start:
  `uvicorn main:app --host 0.0.0.0 --port $PORT`. Env vars:
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGINS`,
  `PYTHON_VERSION=3.12.7`.
- **Database → Supabase.** Already hosted. SQL migrations live in
  `supabase/`; apply via the Dashboard SQL editor.

CORS_ORIGINS in production should be the comma-separated list of
allowed frontend origins (Vercel URL + custom domain), NOT `*` and
NOT `localhost`.

---

## Known gotchas

- **Render free tier sleeps after 15 min idle.** First request after
  sleep takes 30–60s. Acceptable for a portfolio. Uptime pinger or
  paid tier if it becomes annoying.
- **Repo location: `C:\Github\PortofolioWebsite` (NOT in OneDrive).**
  It used to live under `OneDrive\Documents\Github\` where OneDrive sync
  corrupted `.git/index` (recovery was `del .git\index && git reset`).
  It has since been moved to the drive root `C:\Github` to avoid that —
  don't move it back under OneDrive.
- **Supabase migrated to new `sb_publishable_…` / `sb_secret_…` key
  format.** supabase-py 2.8.x rejects these via regex; require >=2.15.
- **Python 3.14 on Render breaks builds** because pydantic-core has no
  3.14 wheel yet. Always pin via `PYTHON_VERSION=3.12.7` env var
  (and/or `runtime.txt`).
- **`EmailStr` needs `email-validator` package** — pydantic doesn't
  install it as a transitive dep. Without it, the API crashes at
  import time on a clean install.
- **`AnimatePresence` `mode="popLayout"` + `LayoutGroup` strands cards
  at opacity 0** when filters toggle quickly. PortfolioClient now uses
  default sync mode — don't reintroduce popLayout there.
- **Never resolve icon names to components on the server and pass them to
  a Client Component.** A react-icons component is a function, and
  functions can't cross the Server→Client boundary (Next serializes props
  as JSON → "Functions cannot be passed directly to Client Components").
  Pass the icon NAME string across the boundary and call `getIcon()` in
  the client. PortfolioClient does this: the server hands it raw
  `ApiCategory[]` (icon as string) and it resolves to `Category[]` itself.
- **Supabase relative imports break uvicorn.** Routers in `api/routers/`
  use absolute imports (`from db import ...`, `from schemas import ...`),
  not relative (`from ..db import ...`), because uvicorn loads
  `main:app` directly without `api/` being a package.
- **Windows shell ≠ Unix shell.** Use `copy`/`del`/`Copy-Item`, not
  `cp`/`rm`. Docs in this repo show both.

---

## What NOT to do

- Don't add `NEXT_PUBLIC_` to anything secret. That prefix exposes the
  variable to every browser visitor.
- Don't commit `.env`, `.env.local`, `api/.env`, or anything with real
  keys. `.gitignore` covers these — don't add exemptions.
- Don't write to Supabase from the browser. Even with anon-key + RLS,
  the FastAPI layer is the contract — go through it.
- Don't `git add .` or `git add -A`. Always specify files. The repo
  has a history of index corruption (from its former OneDrive location);
  broad adds risk staging garbage.
- Don't hand-edit migrations after they've been run in prod. Add a new
  SQL file with the change instead.
- Don't bypass GitHub push protection. If it flags a secret, the secret
  is real — rotate it, scrub the commit (`git commit --amend`), retry.

---

## Things to read first

When picking up this project:

1. `STEPS.md` — first-run walkthrough, deployment, troubleshooting
2. `api/README.md` — backend rationale + run commands
3. `supabase/schema.sql` — every table + the RLS pattern
4. `lib/api.ts` and `lib/icons.ts` — the frontend's view of the API
5. `app/page.tsx` — the one Server Component that orchestrates fetches

The original HTML (pre-Next.js) version is in earlier git history —
useful only as a reference for visual intent, not for code.

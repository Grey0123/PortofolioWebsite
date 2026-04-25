# STEPS — Portfolio architecture, setup, and study guide

This file is your **map** of the project. Read it once top-to-bottom; come
back to specific sections when you actually need them. Every step lists
**what to do**, **what to verify**, and **what to study** so you're not
just running commands blindly.

---

## 1. The 30-second mental model

```
                +----------------+        +----------------+        +-------------+
                |                |  HTTP  |                |   PG   |             |
   browser  →   |  Next.js (3000)|  ───►  |  FastAPI (8000)|  ───►  |  Supabase   |
                |                |        |                |        |  (Postgres) |
                +----------------+        +----------------+        +-------------+
                  React, Tailwind,         Python, Pydantic,         Tables + RLS,
                  Server Components        validation, CORS          row storage
```

- **Next.js** renders the UI. Server Components fetch data on the server
  before any HTML is sent to the browser.
- **FastAPI** is the only thing that talks to Supabase. It owns the
  service-role key and exposes a small typed REST contract.
- **Supabase** is just hosted PostgreSQL with RLS policies and an admin UI.
  We never call it from the browser anymore.

**Why three layers?** Three concrete reasons:

1. **Secret hygiene.** The Supabase service-role key bypasses Row Level
   Security and would give a browser god-mode. By keeping that key in
   FastAPI, only the backend has it.
2. **Stable contract.** The shapes the frontend reads (`/works`,
   `/content`, `/messages`) are defined once in `api/schemas.py` and
   never change just because we tweak the database.
3. **A room for grown-up concerns.** Validation, rate limiting, spam
   filtering, email notifications, observability — they all belong in
   the API layer. Adding them later means changing the API only, not
   the React code.

---

## 2. File map (where everything lives)

```
PortofolioWebsite/
├── app/
│   ├── page.tsx              ← async Server Component; fetches /content,
│   │                            distributes data to sections
│   └── layout.tsx
├── components/
│   ├── Header.tsx            ← receives roles/stats/orbit as props
│   ├── About.tsx             ← receives skills/experience/education
│   ├── Services.tsx          ← receives services list
│   ├── StatsStrip.tsx        ← receives stats list
│   ├── Contact.tsx           ← receives contact_info + social_links;
│   │                            POSTs the form to FastAPI
│   ├── Portfolio.tsx         ← Server Component; fetches /works itself
│   ├── PortfolioClient.tsx   ← Client filter UI
│   ├── TechMarquee.tsx       ← orbit hub; receives orbit_services
│   └── hero/RotatingRole.tsx ← receives roles
├── lib/
│   ├── api.ts                ← typed fetcher to FastAPI
│   ├── icons.ts              ← string→IconType registry
│   └── works.ts              ← Work view-model + categories
├── supabase/
│   ├── schema.sql            ← every table + RLS policy
│   ├── seed.sql              ← initial works rows
│   └── seed_content.sql      ← initial about/services/orbit/etc
├── api/
│   ├── main.py               ← FastAPI app + CORS
│   ├── db.py                 ← Supabase client (cached, service-role)
│   ├── schemas.py            ← Pydantic request/response shapes
│   ├── routers/
│   │   ├── content.py        ← GET /content
│   │   ├── works.py          ← GET /works
│   │   └── messages.py       ← POST /messages
│   ├── requirements.txt
│   └── .env.example
├── .env.example              ← Next.js env template
└── STEPS.md                  ← you are here
```

---

## 3. Setup — first run

### 3.1. Apply the database schema

In the Supabase dashboard:

1. **SQL Editor** → **New query** → paste the contents of
   `supabase/schema.sql` → **Run**. This creates every table and RLS
   policy. Safe to re-run.
2. New query → paste `supabase/seed.sql` → Run. Three portfolio
   projects appear in `works`.
3. New query → paste `supabase/seed_content.sql` → Run. About,
   services, contact, orbit data all populate.

**Verify:** Table Editor → you should see populated rows in `works`,
`stats`, `skills`, `timeline`, `services`, `contact_info`,
`social_links`, `orbit_services`, `orbit_tools`, `rotating_roles`.

**Study:** open `supabase/schema.sql` and read the comments. Note the
pattern: every table has `ENABLE ROW LEVEL SECURITY`, then a `CREATE
POLICY ... FOR SELECT TO anon, authenticated USING (true)`. That's
"public read, no public write." `messages` is the inverse — public write,
no public read — which is exactly right for a contact form.

### 3.2. Run the FastAPI backend

```bash
cd api
python -m venv .venv

# activate the venv
source .venv/bin/activate              # macOS/Linux
.venv\Scripts\activate                 # Windows PowerShell

pip install -r requirements.txt

cp .env.example .env                   # macOS/Linux
copy .env.example .env                 # Windows CMD
Copy-Item .env.example .env            # Windows PowerShell
# Edit .env:
#   SUPABASE_URL=https://<your-project>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard → Project settings → API>
#   CORS_ORIGINS=http://localhost:3000

uvicorn main:app --reload --port 8000
```

**Verify:**

- <http://localhost:8000/>      → `{"status":"ok"}`
- <http://localhost:8000/docs>  → Swagger UI; expand each endpoint and
  hit "Try it out" to call them with no curl required
- <http://localhost:8000/works> → JSON list of your seeded projects
- <http://localhost:8000/content> → JSON bundle of about/services/etc

**Study:**
- `api/main.py` — how FastAPI registers routers and CORS
- `api/db.py` — `lru_cache` makes the Supabase client a lazy singleton
- `api/schemas.py` — Pydantic models double as validation AND
  documentation (FastAPI auto-generates `/docs` from them)
- `api/routers/messages.py` — see how Pydantic validates the incoming
  body before the handler runs

### 3.3. Run the Next.js frontend

```bash
# from repo root
npm install
# .env.local already has NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm run dev
```

Open <http://localhost:3000>. You should see:

- Hero with rotating roles cycling
- Stats strip filled with real counts
- Services grid with the six cards
- About section with three populated tabs
- Portfolio with category-filterable cards
- Contact form that, when submitted, creates a row in
  `public.messages` (visible in the Supabase Table Editor)

**Study:**
- `app/page.tsx` — one `await fetchContent()`, props drilled down
- `lib/api.ts` — Next.js's `fetch(..., { next: { revalidate } })` is
  how you get edge-cached server fetches with ISR
- `lib/icons.ts` — the registry pattern: DB stores strings, frontend
  resolves to React components at render time
- `components/Header.tsx` — server-side composition: shell is a Server
  Component, only the interactive bits are Client Components

---

## 4. Common workflows

### 4.1. Add a new portfolio project

Easiest path: Supabase dashboard → Table Editor → `works` → **Insert
row**. Fill in `title`, `description`, `category` (one of the 5
allowed), `tech` (text array), `year`, optional `image`/`href`/`github`,
toggle `featured` if you want a star. Up to 60s later it appears on the
site (ISR cache).

Faster path while developing: re-run `npm run dev` after inserting —
Next.js refetches on every dev request.

### 4.2. Add a new service to the orbit

Two SQL inserts:

```sql
INSERT INTO public.orbit_services (slug, name, short_name, tagline, color, icon, sort_order)
VALUES ('devops', 'DevOps & SRE', 'DevOps', 'Reliability at scale', '#7e57c2', 'FaServer', 7);

INSERT INTO public.orbit_tools (orbit_service_id, name, icon, sort_order)
SELECT id, 'Kubernetes', 'SiKubernetes', 0 FROM public.orbit_services WHERE slug='devops';
```

If you reference an icon name (`'SiKubernetes'`) that isn't yet in
`lib/icons.ts`, the frontend will fall back to a placeholder. Add it
there in two lines:

```ts
import { SiKubernetes } from "react-icons/si";
export const ICONS: Record<string, IconType> = { /* … */ SiKubernetes };
```

### 4.3. Change the hero copy

Hero copy ("Hi, I'm Nabil", taglines, button labels) is still inline
in `components/Header.tsx` because it's stylistic prose, not data. The
*roles* that rotate, the *stats*, and the *orbit services* are all in
the DB. Trust your gut on the line.

### 4.4. Wire up an admin page later

You already have everything you need. Build `app/admin/page.tsx`,
authenticate with anything (e.g. Clerk, Supabase Auth, basic auth in
front of the API), and add `GET /messages` + `DELETE /messages/{id}` to
`api/routers/messages.py`. The service-role client in `api/db.py` will
happily read messages for you.

---

## 5. What to study, in order

1. **HTTP first.** Open `http://localhost:8000/docs` and click
   through every endpoint. FastAPI's auto-docs let you *poke* the
   contract without writing client code.
2. **Pydantic models.** Read `api/schemas.py` end to end. These are
   the source of truth for what data flows where.
3. **A single FastAPI router.** `api/routers/messages.py` is the
   smallest one — start there. Then `works.py`. Then `content.py`.
4. **Supabase queries.** In each router, the `supabase.table(...)
   .select(...).order(...).execute()` chain is the official pattern.
   It mirrors the JavaScript client almost 1:1.
5. **Next.js fetch caching.** Read `lib/api.ts` and the Next.js
   docs page on
   [`fetch` and `revalidate`](https://nextjs.org/docs/app/building-your-application/data-fetching/caching#fetch).
   The `next: { revalidate: 60 }` line is doing a lot of work.
6. **Server vs Client Components.** Read `app/page.tsx`, then
   `components/Header.tsx`, then `components/RotatingRole.tsx`. Notice
   only the interactive leaves carry `"use client"`. Everything else
   is server-rendered.

---

## 6. Troubleshooting cheatsheet

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `RuntimeError: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set` | `api/.env` missing or unfilled | `cp api/.env.example api/.env`, fill values |
| Page renders but is empty | FastAPI not running | `uvicorn main:app --reload --port 8000` |
| Page renders but only Portfolio is empty | `/works` failing — check FastAPI logs and DB seed | re-run `seed.sql` |
| Contact form returns "Something went wrong" | CORS or API down | check `api/.env` `CORS_ORIGINS` includes `http://localhost:3000`; check the FastAPI logs |
| `next build` complains about unknown env | `NEXT_PUBLIC_API_BASE_URL` missing | `cp .env.example .env.local`; add the var |
| Icons render as "FaCode" placeholder | string in DB doesn't match `lib/icons.ts` | add the import + entry to the registry |

---

## 7. Production deployment (when you're ready)

- **Frontend (Vercel)**: import the repo, set `NEXT_PUBLIC_API_BASE_URL`
  to your deployed FastAPI URL, deploy.
- **Backend (Render / Fly / Railway)**: pick any Python ASGI host;
  command `uvicorn main:app --host 0.0.0.0 --port $PORT`; set
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (mark secret), and
  `CORS_ORIGINS` to your Vercel URL (no localhost).
- **Database**: it's already in Supabase — nothing to deploy.

That's it. Welcome to your modern portfolio stack.

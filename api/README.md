# Portfolio API (FastAPI)

The backend that powers the portfolio. It sits between the Next.js
frontend and Supabase, exposing a small REST contract:

| Method | Path        | Purpose                                                 |
| ------ | ----------- | ------------------------------------------------------- |
| GET    | `/`         | Health check (`{"status":"ok"}`)                        |
| GET    | `/docs`     | Auto-generated Swagger UI                               |
| GET    | `/works`    | All portfolio projects, sorted for display              |
| GET    | `/content`  | Bundle of every "static" thing (about, services, hero…) |
| POST   | `/messages` | Submit a contact form                                   |

## Why does this layer exist?

Three concrete reasons:

1. **Secret hygiene.** The Supabase _service role_ key bypasses Row Level
   Security. It must never reach the browser. By doing all DB calls from
   FastAPI, only this server holds it.
2. **A stable contract.** The frontend never has to know what columns
   exist in Supabase. If we rename or split a table tomorrow, the
   `/content` shape stays the same and the React code doesn't move.
3. **A natural place for cross-cutting concerns.** Validation (Pydantic
   already), rate limiting, spam filters, email notifications, audit
   logs — all easier to add once the boundary exists.

## Running locally

```bash
cd api

# 1. Create a virtual env so deps don't pollute your global Python.
python -m venv .venv
source .venv/bin/activate            # macOS/Linux
.venv\Scripts\activate               # Windows PowerShell

# 2. Install deps.
pip install -r requirements.txt

# 3. Configure env.
cp .env.example .env                 # macOS/Linux
copy .env.example .env               # Windows CMD
Copy-Item .env.example .env          # Windows PowerShell
# then edit .env and fill in real values

# 4. Run the dev server (auto-reloads on file changes).
uvicorn main:app --reload --port 8000
```

Now hit:

- <http://localhost:8000/>      health check
- <http://localhost:8000/docs>  interactive API explorer
- <http://localhost:8000/content> JSON bundle the frontend consumes

## Project structure

```
api/
├── main.py            # FastAPI app, CORS, router registration
├── db.py              # Supabase client factory (cached, service-role)
├── schemas.py         # Pydantic models — request/response shapes
├── routers/
│   ├── __init__.py
│   ├── content.py     # GET /content
│   ├── works.py       # GET /works
│   └── messages.py    # POST /messages
├── requirements.txt
├── .env.example
└── README.md          # ← you are here
```

## Deploying

Any Python ASGI host works (Render, Fly.io, Railway, AWS App Runner,
Vercel via their Python beta). The two things you must set:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (mark as secret)
- `CORS_ORIGINS` set to your deployed frontend URL (no localhost!)

Then point `NEXT_PUBLIC_API_BASE_URL` on the Vercel side at the
deployed backend URL.

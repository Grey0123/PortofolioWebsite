"""
FastAPI entry point for the portfolio backend.

Run locally:
  cd api
  python -m venv .venv && source .venv/bin/activate   # macOS/Linux
  .venv\\Scripts\\activate                              # Windows PowerShell
  pip install -r requirements.txt
  cp .env.example .env  # then fill in real values
  uvicorn main:app --reload --port 8000

Then visit:
  http://localhost:8000/         → "ok" health check
  http://localhost:8000/docs     → Swagger UI to play with endpoints
  http://localhost:8000/content  → the big content bundle
  http://localhost:8000/works    → portfolio projects
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import content, messages, works


# Load env BEFORE we read CORS_ORIGINS below.
load_dotenv()


app = FastAPI(
    title="Portfolio API",
    version="1.0.0",
    description=(
        "Backend that sits between the Next.js frontend and Supabase.\n\n"
        "Why have it at all? It keeps the Supabase service-role key on "
        "the server side, gives us one place to do validation / rate "
        "limiting / spam filtering, and exposes a small, stable contract "
        "to the frontend that doesn't change when we tweak DB schema."
    ),
)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# Browsers block cross-origin requests by default. The Next.js dev server
# runs on http://localhost:3000 while this API runs on :8000 — different
# origins, so we have to opt-in here. Only origins listed in CORS_ORIGINS
# are allowed; in production we narrow it to the deployed frontend URL.
_origins = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,    # we don't use cookies; safer with this off
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", tags=["health"])
def health() -> dict[str, str]:
    """Tiny liveness probe — useful for Vercel/Render health checks."""
    return {"status": "ok"}


# Each router file declares its own prefix and tags, so we just include them.
app.include_router(content.router)
app.include_router(works.router)
app.include_router(messages.router)

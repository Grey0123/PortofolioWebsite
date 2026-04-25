"""
GET /works — list all portfolio projects, ordered the way the UI expects.

Why this lives in its own router file:
  - Easy to find when you want to add a feature (e.g. /works/{id}).
  - Routers are the unit FastAPI uses for prefixes, tags, dependencies.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from supabase import Client

from db import get_supabase
from schemas import Work


# `prefix` means every path here is implicitly /works/...
# `tags` groups endpoints in the auto-generated /docs page.
router = APIRouter(prefix="/works", tags=["works"])


@router.get("", response_model=list[Work])
def list_works(supabase: Client = Depends(get_supabase)) -> list[Work]:
    """
    Return all works ordered by:
      1. sort_order asc (NULLs last) — manually-pinned projects first
      2. year desc                    — newest projects next
      3. created_at desc              — final tiebreaker

    The Supabase client returns plain dicts; FastAPI's `response_model`
    turns them into Work instances and strips any extra columns
    (id, created_at, sort_order) so the frontend only sees what it needs.
    """
    try:
        result = (
            supabase
            .table("works")
            .select("*")
            # Note: supabase-py's `order` doesn't expose `nullsfirst`; the
            # CHECK we want — sort_order asc, NULLs last — needs an inline
            # foreign-table or RPC. As a workable compromise, we ORDER on
            # the server and then re-sort here in Python: tiny dataset,
            # cost is negligible.
            .order("year", desc=True)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        # Most common cause: bad creds or network issue. Surface a 502 so
        # the frontend can render an empty state without crashing.
        raise HTTPException(status_code=502, detail=f"Supabase error: {exc}") from exc

    rows = result.data or []
    # Python sort is stable, so applying sort_order LAST means rows with
    # the same sort_order keep their year/created_at ordering. NULLs go
    # to the end via the `(row.get("sort_order") is None, ...)` trick.
    rows.sort(key=lambda r: (r.get("sort_order") is None, r.get("sort_order") or 0))
    return rows

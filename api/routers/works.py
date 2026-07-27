"""
Portfolio project endpoints.

  GET /works         — the lean list that fills the grid.
  GET /works/{slug}  — one project with its long-form content and gallery.

The split is deliberate. The grid renders every project, so its payload is
kept small; the detail page renders one, so it can afford the markdown body
and image rows. Putting `body_md` in the list response would mean shipping
every write-up to every visitor who only ever looks at the cards.

Why this lives in its own router file:
  - Easy to find when you want to add a feature.
  - Routers are the unit FastAPI uses for prefixes, tags, dependencies.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from supabase import Client

from db import get_supabase
from schemas import ProjectDetail, Work


# `prefix` means every path here is implicitly /works/...
# `tags` groups endpoints in the auto-generated /docs page.
router = APIRouter(prefix="/works", tags=["works"])

# Columns the GRID needs. Listing them explicitly (rather than "*") keeps the
# heavy new columns — body_md above all — out of the list query entirely. The
# response_model would strip them anyway, but only AFTER Supabase has already
# serialized them and shipped them over the network to us. Filtering at the
# source is the cheaper place to do it.
LIST_COLUMNS = (
    "title,description,category,tech,year,image,href,github,featured,slug,"
    "sort_order,created_at"
)


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
            .select(LIST_COLUMNS)
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


@router.get("/{slug}", response_model=ProjectDetail)
def get_work(slug: str, supabase: Client = Depends(get_supabase)) -> dict:
    """
    Return one project by its URL slug, with its gallery images attached.

    Path-ordering note: FastAPI matches routes in declaration order, and
    "/{slug}" is a catch-all for any single segment. It is declared AFTER
    the "" list route, so GET /works still hits `list_works`. If you ever
    add a literal sibling route like /works/featured, declare it ABOVE this
    one or it will be swallowed as slug="featured".

    The `select("*, project_images(*)")` is PostgREST's embedded-resource
    syntax: it follows the foreign key from project_images.work_id back to
    works.id and nests the matching rows under an "project_images" key, in
    ONE round trip. The alternative — query the work, then query its images
    — is two requests and a classic N+1 in the making.
    """
    try:
        result = (
            supabase
            .table("works")
            .select("*, project_images(*)")
            .eq("slug", slug)
            # `limit(1)` rather than `.single()`: single() makes PostgREST
            # return an error status when zero rows match, which supabase-py
            # raises as an exception. We WANT "not found" to be an ordinary,
            # non-exceptional outcome we turn into a clean 404 below.
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Supabase error: {exc}") from exc

    rows = result.data or []
    if not rows:
        # A real 404 (not an empty 200) is what lets the Next.js page call
        # notFound() and render the proper not-found UI with a 404 status —
        # which is also what search engines need to see.
        raise HTTPException(status_code=404, detail=f"No project with slug '{slug}'")

    work = rows[0]

    # Sort the gallery here rather than in the query. supabase-py's ordering
    # of an EMBEDDED table has moved between versions (foreign_table= vs
    # referenced_table=), and this list is a handful of rows — Python sorting
    # it costs nothing and can't break on a library upgrade.
    images = work.pop("project_images", None) or []
    images.sort(key=lambda img: img.get("sort_order") or 0)
    work["images"] = images

    # response_model=ProjectDetail drops the columns the frontend has no
    # business seeing (id, sort_order, created_at) and validates the rest.
    return work

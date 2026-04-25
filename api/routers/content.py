"""
GET /content — single endpoint that returns ALL of the static content
(About, Services, Stats, Contact, Hero, TechMarquee orbit) in one bundle.

Design rationale:
  - The Next.js page wants this data once at server-render time.
  - Bundling 8 small tables into one response is cheaper than 8 round
    trips, and lets the frontend cache it under a single key.
  - Each table is read with a separate Supabase call — supabase-py
    doesn't have a transactional batch read, but they're independent
    so we can fan them out concurrently if it ever matters.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from db import get_supabase
from schemas import (
    ContactInfo,
    ContentBundle,
    OrbitService,
    OrbitTool,
    RotatingRole,
    Service,
    Skill,
    SocialLink,
    Stat,
    TimelineItem,
)


router = APIRouter(prefix="/content", tags=["content"])


# ---- helpers --------------------------------------------------------------

def _ordered(supabase: Client, table: str, *order_cols: str) -> list[dict[str, Any]]:
    """
    Tiny helper: select all rows from `table`, ordered by the given columns
    (each ascending). Returns rows as raw dicts.
    """
    query = supabase.table(table).select("*")
    for col in order_cols:
        query = query.order(col, desc=False)
    return query.execute().data or []


# ---- main endpoint --------------------------------------------------------

@router.get("", response_model=ContentBundle)
def get_content_bundle(supabase: Client = Depends(get_supabase)) -> ContentBundle:
    try:
        rotating_roles = _ordered(supabase, "rotating_roles", "sort_order")
        stats          = _ordered(supabase, "stats", "sort_order")
        skills         = _ordered(supabase, "skills", "sort_order")
        timeline       = _ordered(supabase, "timeline", "sort_order")
        services       = _ordered(supabase, "services", "sort_order")
        social_links   = _ordered(supabase, "social_links", "sort_order")
        orbit_services = _ordered(supabase, "orbit_services", "sort_order")
        orbit_tools    = _ordered(supabase, "orbit_tools", "orbit_service_id", "sort_order")

        # contact_info is a single-row table; .single() raises if 0 or >1
        # rows exist, so we use .limit(1) and pick the first instead — that
        # way an empty table doesn't crash the whole bundle.
        contact_rows = (
            supabase.table("contact_info").select("*").limit(1).execute().data or []
        )
        contact_info = contact_rows[0] if contact_rows else None
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Supabase error: {exc}") from exc

    # Group orbit_tools under their orbit_service. Doing this on the server
    # means the frontend gets a tree shape instead of two flat arrays it
    # would have to join itself.
    tools_by_service: dict[str, list[OrbitTool]] = {}
    for tool in orbit_tools:
        tools_by_service.setdefault(tool["orbit_service_id"], []).append(
            OrbitTool(name=tool["name"], icon=tool.get("icon"))
        )

    orbit_payload: list[OrbitService] = [
        OrbitService(
            slug=svc["slug"],
            name=svc["name"],
            short_name=svc["short_name"],
            tagline=svc["tagline"],
            color=svc["color"],
            icon=svc["icon"],
            tools=tools_by_service.get(svc["id"], []),
        )
        for svc in orbit_services
    ]

    # Split timeline by `kind` for the frontend (it renders experience and
    # education in separate tabs). Each filter preserves the source order.
    experience = [t for t in timeline if t["kind"] == "experience"]
    education  = [t for t in timeline if t["kind"] == "education"]

    return ContentBundle(
        rotating_roles=[RotatingRole(label=r["label"]) for r in rotating_roles],
        stats=[Stat(**s) for s in stats],
        skills=[Skill(**s) for s in skills],
        experience=[TimelineItem(**t) for t in experience],
        education=[TimelineItem(**t) for t in education],
        services=[Service(**s) for s in services],
        contact_info=ContactInfo(**contact_info) if contact_info else None,
        social_links=[SocialLink(**l) for l in social_links],
        orbit_services=orbit_payload,
    )

"""
Pydantic models for request bodies and response payloads.

Two reasons we declare these explicitly instead of returning whatever
Supabase hands back:

  1. **Validation** — incoming requests (e.g. POST /messages) are
     auto-validated; malformed bodies get a 422 with a helpful message
     before our handler runs.
  2. **Contract** — the response shape becomes part of the OpenAPI
     spec FastAPI generates at /docs. The Next.js side reads these
     same shapes via lib/api.ts, so the JSON keys here are *also* the
     keys the frontend expects. Renaming a field is a coordinated change.

Naming convention: snake_case in transit (matches the DB columns),
which the frontend can either accept directly or alias as needed.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


# =============================================================
# WORKS (portfolio projects)
# =============================================================
class Work(BaseModel):
    title: str
    description: str
    category: Literal["data", "automation", "ai", "web", "analytics"]
    tech: list[str]
    year: int
    image: Optional[str] = None
    href: Optional[str] = None
    github: Optional[str] = None
    featured: bool = False


# =============================================================
# MESSAGES (contact form)
# =============================================================
class MessageIn(BaseModel):
    """Body of POST /messages — validated before the handler runs."""

    # `min_length=1` rejects empty strings; `max_length` keeps DB clean.
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    # Message body is optional; we allow None or a string up to ~10k chars.
    message: Optional[str] = Field(default=None, max_length=10_000)


class MessageOut(BaseModel):
    """Minimal response so we don't echo back the data we just stored."""

    ok: bool = True


# =============================================================
# CONTENT (everything that used to be hardcoded in components/)
# =============================================================
class RotatingRole(BaseModel):
    label: str


class Stat(BaseModel):
    icon: str
    label: str
    value_number: Optional[int] = None
    value_text: Optional[str] = None
    suffix: Optional[str] = None


class Skill(BaseModel):
    title: str
    detail: str


class TimelineItem(BaseModel):
    kind: Literal["experience", "education"]
    period: str
    title: str
    org: str
    detail: str


class Service(BaseModel):
    icon: str
    title: str
    tagline: str
    description: str
    color: str
    tech: list[str]


class ContactInfo(BaseModel):
    email: str
    phone: Optional[str] = None
    cv_url: Optional[str] = None


class SocialLink(BaseModel):
    platform: str
    url: str
    icon: str


class OrbitTool(BaseModel):
    name: str
    icon: Optional[str] = None


class OrbitService(BaseModel):
    slug: str
    name: str
    short_name: str
    tagline: str
    color: str
    icon: str
    tools: list[OrbitTool]


class ContentBundle(BaseModel):
    """
    Single response that bundles ALL static content.

    Why bundle instead of one-endpoint-per-table?
      - The Next.js page server-renders these on every request — fewer
        round-trips = faster page render.
      - It's still cheap on Supabase (8 tables, all small).
      - The frontend can cache the whole bundle with a single revalidate
        rule.
    """

    rotating_roles: list[RotatingRole]
    stats: list[Stat]
    skills: list[Skill]
    experience: list[TimelineItem]
    education: list[TimelineItem]
    services: list[Service]
    contact_info: Optional[ContactInfo]
    social_links: list[SocialLink]
    orbit_services: list[OrbitService]

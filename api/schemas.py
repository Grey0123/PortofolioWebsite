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
# CATEGORIES (filter chips for the portfolio grid)
# =============================================================
class Category(BaseModel):
    """
    A project category, now stored in the `categories` table so it can be
    edited from the Supabase dashboard. `icon` is a react-icons NAME (e.g.
    "FaDatabase") that the frontend resolves via lib/icons.ts.
    """

    id: str
    label: str
    color: str
    icon: str


# =============================================================
# WORKS (portfolio projects)
# =============================================================
class Work(BaseModel):
    title: str
    description: str
    # Was a Literal of five fixed strings. It's now a free `str` because the
    # valid set lives in the `categories` table — the DB foreign key (not
    # this schema) is what enforces that the value is a real category.
    category: str
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


class CandidPhoto(BaseModel):
    """Row from `candid_photos` — feeds the carousel in the About section."""

    image_path: str
    alt: str
    # CSS object-position for the square crop, e.g. "30% center". Optional;
    # the frontend defaults to "center" when missing.
    position: Optional[str] = None


class Place(BaseModel):
    """Row from `places` — feeds the bento grid in the Travel section."""

    image_path: str
    place: str
    caption: str
    # Tailwind grid placement string, e.g. "md:col-span-2 md:row-span-2".
    # Nullable — when missing the tile takes the default 1x1 size.
    span: Optional[str] = None


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
    # Editable project categories — drive the portfolio filter chips. Default
    # to [] so the bundle still validates on a DB that predates the categories
    # table (the frontend falls back to its built-in list in that case).
    categories: list[Category] = []
    stats: list[Stat]
    skills: list[Skill]
    experience: list[TimelineItem]
    education: list[TimelineItem]
    services: list[Service]
    contact_info: Optional[ContactInfo]
    social_links: list[SocialLink]
    orbit_services: list[OrbitService]
    # Default to empty lists so the bundle still validates while the gallery
    # tables are empty / not yet seeded — the frontend has fallback content.
    candid_photos: list[CandidPhoto] = []
    places: list[Place] = []

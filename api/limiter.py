"""
Shared rate limiter used by FastAPI routes (currently just POST /messages).

Why a separate module instead of defining this in main.py?
  main.py imports the routers, and the routers need the limiter for their
  decorators. If we defined it in main.py and imported it from messages.py,
  we'd have a circular import (main → messages → main). A tiny standalone
  module breaks that cycle.

Why per-IP limiting?
  The contact form has no auth (you don't want recruiters to log in just
  to message you). Without rate limiting, a single bot can hammer the
  endpoint thousands of times per minute, fill your Supabase table with
  garbage, and chew through your free-tier quotas. Capping by IP is the
  cheapest defense that doesn't degrade the legitimate UX.

Why the custom key_func?
  slowapi's built-in `get_remote_address` returns `request.client.host`,
  which on Render (and any proxy/load balancer) is the PROXY's IP — so
  every request would share one rate-limit bucket and the limit would be
  useless. We honor the X-Forwarded-For header when present (the proxy
  sets it to the real client IP), falling back to remote_address in dev.
"""

from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def get_client_ip(request: Request) -> str:
    """Pick the real client IP, accounting for proxies."""
    # X-Forwarded-For looks like "real-client-ip, proxy1-ip, proxy2-ip"
    # — the first entry is the original caller.
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return get_remote_address(request)


# `default_limits` is empty so endpoints opt-in via `@limiter.limit(...)`.
# That avoids accidentally rate-limiting things like /content (which the
# Next.js server fetches on every page render).
limiter = Limiter(key_func=get_client_ip)

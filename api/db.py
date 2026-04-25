"""
Supabase client factory.

We expose a single, lazily-initialized `get_supabase()` dependency that
FastAPI routers can inject. Keeping it as a function (rather than a
module-level instance) means:

  1. Importing this module never reads env vars or opens a network
     connection — useful for tests and tooling.
  2. We can swap implementations later (e.g. a fake client for tests)
     by overriding the dependency in `app.dependency_overrides`.

We use the SERVICE ROLE key here. That key bypasses RLS, which is exactly
what we want for a server-to-server boundary: the FastAPI layer is the
*only* enforcement point for "what's the frontend allowed to read/write".
The anon key is never used on the backend.
"""

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv
from supabase import Client, create_client


# Load .env once at import time. python-dotenv is a no-op if there's no
# .env file (e.g. in production where env vars are already set), so this
# is safe in every environment.
load_dotenv()


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """
    Return a cached Supabase client wired to the service-role key.

    `lru_cache` makes this effectively a singleton — the first call builds
    the client, every subsequent call returns the same instance. Avoids
    re-reading env vars and re-opening HTTP connections on every request.
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        # Fail loudly, not silently. If the API starts without creds we'd
        # get cryptic 500s on every endpoint; this gives a clear hint.
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. "
            "Copy api/.env.example to api/.env and fill in the values."
        )

    return create_client(url, key)

"""
POST /messages — accept a contact form submission and store it in Supabase.

The frontend now hits THIS endpoint instead of calling Supabase directly,
which gives us:
  - Server-side validation via Pydantic (EmailStr rejects bad emails).
  - A single place to add rate limiting / spam filtering / notification
    emails later, without touching the React components.
  - The Supabase service role key never leaves the backend.
"""

# NOTE: deliberately NOT using `from __future__ import annotations` here.
# Slowapi's @limiter.limit decorator wraps the endpoint and the wrapped
# function's __globals__ no longer contains MessageIn — so when Pydantic
# tries to resolve the (string-form) forward ref at app-startup, it
# raises `NameError: name 'MessageIn' is not defined`. Evaluating the
# annotations eagerly (the default in Python <3.14) sidesteps the issue.

from fastapi import APIRouter, Depends, HTTPException, Request
from supabase import Client

from db import get_supabase
from limiter import limiter
from schemas import MessageIn, MessageOut


router = APIRouter(prefix="/messages", tags=["messages"])


# Rate limit — 5 submissions per hour per IP. Plenty for a real visitor
# (who'll send one or two messages, max), strict enough that a script
# spamming the form gets shut down fast. The decorator MUST go AFTER
# @router.post and BEFORE the function definition. The function ALSO has
# to accept a `request: Request` parameter — slowapi reads it to figure
# out which IP made the call.
@router.post("", response_model=MessageOut, status_code=201)
@limiter.limit("5/hour")
def create_message(
    request: Request,        # required by slowapi — don't remove
    body: MessageIn,
    supabase: Client = Depends(get_supabase),
) -> MessageOut:
    """
    Insert one row into public.messages.

    We deliberately don't return the row back — the form doesn't need it,
    and not echoing keeps the API a strict write-only surface (matches
    the RLS policy on the `messages` table).

    Over the limit? slowapi will short-circuit BEFORE this function runs
    and return 429 Too Many Requests with a Retry-After header. The
    Next.js form treats any non-2xx as a generic failure today; you can
    sniff for 429 specifically later if you want a friendlier message.
    """
    payload = {
        "name": body.name.strip(),
        "email": body.email.strip(),
        # Empty string → NULL in DB; matches what the old client did.
        "message": (body.message or "").strip() or None,
    }

    try:
        supabase.table("messages").insert(payload).execute()
    except Exception as exc:
        # Hide the underlying detail from the public client; log on server.
        # In a real app we'd hook a structured logger here.
        print(f"[messages] insert failed: {exc}")
        raise HTTPException(status_code=502, detail="Could not save message") from exc

    return MessageOut(ok=True)

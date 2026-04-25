"""
POST /messages — accept a contact form submission and store it in Supabase.

The frontend now hits THIS endpoint instead of calling Supabase directly,
which gives us:
  - Server-side validation via Pydantic (EmailStr rejects bad emails).
  - A single place to add rate limiting / spam filtering / notification
    emails later, without touching the React components.
  - The Supabase service role key never leaves the backend.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from db import get_supabase
from schemas import MessageIn, MessageOut


router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("", response_model=MessageOut, status_code=201)
def create_message(
    body: MessageIn,
    supabase: Client = Depends(get_supabase),
) -> MessageOut:
    """
    Insert one row into public.messages.

    We deliberately don't return the row back — the form doesn't need it,
    and not echoing keeps the API a strict write-only surface (matches
    the RLS policy on the `messages` table).
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

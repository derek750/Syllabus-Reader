from typing import Dict, Optional
import os

from dotenv import load_dotenv

load_dotenv()

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from ..db import supabase_client


def verify_google_id_token(token: str, audience: Optional[str] = None) -> Dict[str, str]:
    request = google_requests.Request()
    # id_token.verify_oauth2_token will validate signature & expiry.
    payload = id_token.verify_oauth2_token(token, request, audience)
    # minimal validation
    if not payload.get("email"):
        raise ValueError("Token does not contain an email")
    return payload


def get_or_create_user_by_email(email: str) -> Dict[str, any]:
    # Attempt to find user in 'users' table by email
    try:
        rows = supabase_client.read_rows("users", select="*", query={"email": email})
    except Exception as e:
        raise RuntimeError(f"Error querying users table: {e}")

    if rows:
        # Return the first matched user
        return rows[0]

    # Create a minimal user record. Adjust fields to match your schema.
    from datetime import datetime

    now = datetime.utcnow().isoformat() + "Z"
    # can add new fields -------------
    new_user = {
        "email": email,
        "provider": "google",
        "created_at": now,
        "last_sign_in_at": now,
    }

    try:
        inserted = supabase_client.insert_row("users", new_user)
    except Exception as e:
        raise RuntimeError(f"Error inserting new user: {e}")

    return inserted


__all__ = ["verify_google_id_token", "get_or_create_user_by_email"]

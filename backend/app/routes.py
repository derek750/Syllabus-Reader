from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .auth.google_auth import verify_google_id_token, get_or_create_user_by_email
from .db import supabase_client
import os

router = APIRouter(prefix="/api")


class IDTokenRequest(BaseModel):
    id_token: str
    audience: str | None = None


class InsertRequest(BaseModel):
    data: Dict[str, Any]


@router.get("/health")
def health_check():
    return {"status": "ok"}


@router.post("/auth/google")
async def auth_google(payload: IDTokenRequest):
    try:
        token_payload = verify_google_id_token(payload.id_token, payload.audience)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

    email = token_payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google token missing email")

    try:
        user = get_or_create_user_by_email(email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"User persistence error: {e}")

    return {"user": user, "token_payload": token_payload}



@router.get("/auth/google-config")
async def google_config():
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    return {"client_id": client_id}


@router.get("/db/{table}")
async def db_read(table: str, request: Request):
    """Read rows from a Supabase table.

    Any query parameters provided will be used as equality filters.
    Example: `/api/db/users?email=foo@x.com`.
    """
    filters = dict(request.query_params)
    try:
        rows = supabase_client.read_rows(table, select="*", query=filters or None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"rows": rows}


@router.post("/db/{table}")
async def db_insert(table: str, payload: InsertRequest):
    """Insert a row into a Supabase table. Returns the inserted row."""
    try:
        row = supabase_client.insert_row(table, payload.data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"row": row}

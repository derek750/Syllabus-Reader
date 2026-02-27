from typing import Any, Dict, List, Optional
import os

from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    # Keep this non-fatal; callers should surface a clearer error in production
    # but this helps during development when env vars aren't set yet.
    _MISSING_SUPABASE = True
else:
    _MISSING_SUPABASE = False

try:
    # supabase client creation
    from supabase import create_client

    _client = None

    if not _MISSING_SUPABASE:
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception:
    _client = None


def _ensure_client():
    """Raise a clear error if Supabase client is not configured."""
    if _client is None:
        raise RuntimeError(
            "Supabase client is not initialized. Set SUPABASE_URL and SUPABASE_KEY in env."
        )


def read_rows(table: str, select: str = "*", query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Read rows from a Supabase table.

    Args:
        table: table name
        select: select expression (default '*')
        query: optional dict of equality filters, e.g. {'email': 'x@x.com'}

    Returns: list of rows (as dicts)
    """
    _ensure_client()
    builder = _client.table(table).select(select)
    if query:
        for k, v in query.items():
            builder = builder.eq(k, v)
    res = builder.execute()
    # Handle multiple possible response shapes from different supabase-py versions.
    data = None
    error = None
    if isinstance(res, dict):
        data = res.get("data")
        error = res.get("error")
    else:
        error = getattr(res, "error", None)
        data = getattr(res, "data", None)
        # Some client versions return an http-like response with json()
        if error is None and data is None and hasattr(res, "json"):
            try:
                body = res.json()
                if isinstance(body, dict):
                    data = body.get("data")
                    error = body.get("error")
            except Exception:
                pass

    if error:
        raise RuntimeError(f"Supabase read error: {error}")
    return data or []


def insert_row(table: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a single row into a table and return the inserted row.

    Placeholder — adapt upsert/returning behavior as needed.
    """
    _ensure_client()
    res = _client.table(table).insert(data).execute()

    resp_data = None
    resp_error = None
    if isinstance(res, dict):
        resp_data = res.get("data")
        resp_error = res.get("error")
    else:
        resp_error = getattr(res, "error", None)
        resp_data = getattr(res, "data", None)
        if resp_error is None and resp_data is None and hasattr(res, "json"):
            try:
                body = res.json()
                if isinstance(body, dict):
                    resp_data = body.get("data")
                    resp_error = body.get("error")
            except Exception:
                pass

    if resp_error:
        raise RuntimeError(f"Supabase insert error: {resp_error}")
    return (resp_data or [None])[0]


def update_row(table: str, pk_column: str, pk_value: Any, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update a row by primary key column and return the updated row."""
    _ensure_client()
    res = _client.table(table).update(data).eq(pk_column, pk_value).execute()
    resp_error = getattr(res, "error", None) if not isinstance(res, dict) else res.get("error")
    resp_data = getattr(res, "data", None) if not isinstance(res, dict) else res.get("data")
    if resp_error:
        raise RuntimeError(f"Supabase update error: {resp_error}")
    return (resp_data or [None])[0]


def delete_row(table: str, pk_column: str, pk_value: Any) -> None:
    """Delete a row by primary key value."""
    _ensure_client()
    res = _client.table(table).delete().eq(pk_column, pk_value).execute()
    resp_error = getattr(res, "error", None) if not isinstance(res, dict) else res.get("error")
    if resp_error:
        raise RuntimeError(f"Supabase delete error: {resp_error}")
    return None


__all__ = ["read_rows", "insert_row", "update_row", "delete_row"]

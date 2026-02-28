"""
Redis cache for courses and assignments.

Uses REDIS_URL (default: redis://localhost:6379/0). If Redis is unavailable or
REDIS_URL is empty, cache operations are no-ops (get returns None, set/delete do nothing).
"""

import json
import os
from typing import Any, List, Optional

_REDIS_CLIENT: Optional[Any] = None
_DEFAULT_TTL = 300  # 5 minutes


def _get_client():
    global _REDIS_CLIENT
    if _REDIS_CLIENT is not None:
        return _REDIS_CLIENT
    url = os.getenv("REDIS_URL", "redis://localhost:6379/0").strip()
    if not url:
        return None
    try:
        import redis
        _REDIS_CLIENT = redis.from_url(url, decode_responses=True)
        _REDIS_CLIENT.ping()
        return _REDIS_CLIENT
    except Exception:
        _REDIS_CLIENT = None
        return None


def cache_get(key: str) -> Optional[Any]:
    """Get value from cache. Returns None if miss or Redis unavailable."""
    client = _get_client()
    if not client:
        return None
    try:
        raw = client.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:
        return None


def cache_set(key: str, value: Any, ttl_seconds: int = _DEFAULT_TTL) -> None:
    """Set value in cache. No-op if Redis unavailable."""
    client = _get_client()
    if not client:
        return
    try:
        client.setex(key, ttl_seconds, json.dumps(value, default=str))
    except Exception:
        pass


def cache_delete(key: str) -> None:
    """Delete a key. No-op if Redis unavailable."""
    client = _get_client()
    if not client:
        return
    try:
        client.delete(key)
    except Exception:
        pass


def cache_delete_pattern(pattern: str) -> None:
    """Delete all keys matching pattern (e.g. 'course_assignments:abc:*'). No-op if Redis unavailable."""
    client = _get_client()
    if not client:
        return
    try:
        keys = list(client.scan_iter(match=pattern, count=100))
        if keys:
            client.delete(*keys)
    except Exception:
        pass


# Key builders (used by db modules)
def key_user_courses(user_id: str) -> str:
    return f"user_courses:{user_id}"


def key_course(course_id: str) -> str:
    return f"course:{course_id}"


def key_course_assignments(course_id: str, include_archived: bool) -> str:
    return f"course_assignments:{course_id}:{include_archived}"


def key_assignment(assignment_id: str) -> str:
    return f"assignment:{assignment_id}"


__all__ = [
    "cache_get",
    "cache_set",
    "cache_delete",
    "cache_delete_pattern",
    "key_user_courses",
    "key_course",
    "key_course_assignments",
    "key_assignment",
]

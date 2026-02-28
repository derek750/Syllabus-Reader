from typing import Any, Dict, List, Optional
from datetime import datetime

from .supabase_client import insert_row, read_rows, update_row, delete_row
from app.cache import (
    cache_get,
    cache_set,
    cache_delete,
    key_course_assignments,
    key_assignment,
)


def _invalidate_course_assignments(course_id: str) -> None:
    cache_delete(key_course_assignments(course_id, True))
    cache_delete(key_course_assignments(course_id, False))


def create_assignment(
    course_id: str,
    name: str,
    due_date: Optional[str] = None,
    worth: float = 0,
    extra_info: Optional[str] = None,
    location: Optional[str] = None,
    grade: Optional[float] = None,
    due_time: Optional[str] = None,
    archived: Optional[bool] = False,
) -> Dict[str, Any]:
    """Create a new assignment for a course. due_date may be None if unknown."""
    data = {
        "course_id": course_id,
        "name": name,
        "worth": worth,
        "extra_info": extra_info,
        "location": location,
        "grade": grade,
        "due_time": due_time,
        "archived": bool(archived) if archived is not None else False,
    }
    if due_date is not None and str(due_date).strip():
        data["due_date"] = due_date.strip()
    else:
        data["due_date"] = None
    row = insert_row("assignments", data)
    _invalidate_course_assignments(course_id)
    return row


def get_course_assignments(course_id: str, include_archived: bool = False) -> List[Dict[str, Any]]:
    """Get assignments for a course, optionally including archived ones."""
    key = key_course_assignments(course_id, include_archived)
    cached = cache_get(key)
    if cached is not None:
        return cached
    query: Dict[str, Any] = {"course_id": course_id}
    if not include_archived:
        query["archived"] = False
    rows = read_rows("assignments", query=query)
    cache_set(key, rows)
    return rows


def get_assignment(assignment_id: str) -> Dict[str, Any]:
    """Get a single assignment by ID."""
    key = key_assignment(assignment_id)
    cached = cache_get(key)
    if cached is not None:
        return cached
    rows = read_rows("assignments", query={"id": assignment_id})
    result = rows[0] if rows else None
    if result is not None:
        cache_set(key, result)
    return result


def update_assignment(assignment_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update an assignment."""
    existing = get_assignment(assignment_id)
    course_id = existing.get("course_id") if existing else None
    data["updated_at"] = datetime.utcnow().isoformat()
    row = update_row("assignments", "id", assignment_id, data)
    cache_delete(key_assignment(assignment_id))
    if course_id:
        _invalidate_course_assignments(course_id)
    return row


def delete_assignment(assignment_id: str) -> None:
    """Delete an assignment."""
    existing = get_assignment(assignment_id)
    course_id = existing.get("course_id") if existing else None
    delete_row("assignments", "id", assignment_id)
    cache_delete(key_assignment(assignment_id))
    if course_id:
        _invalidate_course_assignments(course_id)

def delete_assignments_for_course(course_id: str) -> None:
    """Delete all assignments linked to a course."""
    assignments = get_course_assignments(course_id)
    for assignment in assignments:
        delete_assignment(assignment.get("id"))


__all__ = [
    "create_assignment",
    "get_course_assignments",
    "get_assignment",
    "update_assignment",
    "delete_assignment",
]


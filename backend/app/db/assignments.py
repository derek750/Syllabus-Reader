from typing import Any, Dict, List, Optional
from datetime import datetime

from .supabase_client import insert_row, read_rows, update_row, delete_row


def create_assignment(
    course_id: str,
    name: str,
    due_date: str,
    worth: float,
    extra_info: Optional[str] = None,
    location: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a new assignment for a course."""
    data = {
        "course_id": course_id,
        "name": name,
        "due_date": due_date,
        "worth": worth,
        "extra_info": extra_info,
        "location": location,
    }
    return insert_row("assignments", data)


def get_course_assignments(course_id: str) -> List[Dict[str, Any]]:
    """Get all assignments for a course."""
    return read_rows("assignments", query={"course_id": course_id})


def get_assignment(assignment_id: str) -> Dict[str, Any]:
    """Get a single assignment by ID."""
    rows = read_rows("assignments", query={"id": assignment_id})
    return rows[0] if rows else None


def update_assignment(assignment_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update an assignment."""
    data["updated_at"] = datetime.utcnow().isoformat()
    return update_row("assignments", "id", assignment_id, data)


def delete_assignment(assignment_id: str) -> None:
    """Delete an assignment."""
    delete_row("assignments", "id", assignment_id)


__all__ = [
    "create_assignment",
    "get_course_assignments",
    "get_assignment",
    "update_assignment",
    "delete_assignment",
]


from typing import Any, Dict, List, Optional
from datetime import datetime

from .supabase_client import insert_row, read_rows, update_row, delete_row


def create_assignment(
    course_id: str,
    name: str,
    due_date: Optional[str] = None,
    worth: float = 0,
    extra_info: Optional[str] = None,
    location: Optional[str] = None,
    grade: Optional[float] = None,
    due_time: Optional[str] = None,
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
    }
    if due_date is not None and str(due_date).strip():
        data["due_date"] = due_date.strip()
    else:
        data["due_date"] = None
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


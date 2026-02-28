from typing import Any, Dict, List, Optional
import os
from datetime import datetime
from .supabase_client import insert_row, read_rows, update_row, delete_row
from app.cache import (
    cache_get,
    cache_set,
    cache_delete,
    cache_delete_pattern,
    key_user_courses,
    key_course,
)

# import here to avoid circular import if routes import courses
from .pdf_storage import delete_syllabus_pdf
from .assignments import delete_assignments_for_course


def create_course(user_id: str, course_name: str, course_code: Optional[str] = None, 
                 semester: Optional[str] = None, instructor: Optional[str] = None) -> Dict[str, Any]:
    """Create a new course for a user."""
    data = {
        "user_id": user_id,
        "course_name": course_name,
        "course_code": course_code,
        "semester": semester,
        "instructor": instructor,
    }
    row = insert_row("courses", data)
    cache_delete(key_user_courses(user_id))
    return row


def get_user_courses(user_id: str) -> List[Dict[str, Any]]:
    """Get all courses for a user."""
    key = key_user_courses(user_id)
    cached = cache_get(key)
    if cached is not None:
        return cached
    rows = read_rows("courses", query={"user_id": user_id})
    cache_set(key, rows)
    return rows


def get_course(course_id: str) -> Dict[str, Any]:
    """Get a single course by ID."""
    key = key_course(course_id)
    cached = cache_get(key)
    if cached is not None:
        return cached
    rows = read_rows("courses", query={"id": course_id})
    result = rows[0] if rows else None
    if result is not None:
        cache_set(key, result)
    return result


def delete_course(course_id: str) -> None:
    # first clean up syllabi linked to this course
    syllabi = get_course_syllabi(course_id)
    for syllabus in syllabi:
        try:
            # remove file from storage; ignore errors to continue
            delete_syllabus_pdf(syllabus.get("file_path"))
        except Exception:
            pass
        # remove DB entry
        delete_syllabus(syllabus.get("id"))

    # remove all assignments linked to this course
    delete_assignments_for_course(course_id)

    # finally remove the course row
    delete_row("courses", "id", course_id)
    cache_delete(key_course(course_id))
    cache_delete_pattern(f"course_assignments:{course_id}:*")


def update_course(course_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update a course."""
    data["updated_at"] = datetime.utcnow().isoformat()
    row = update_row("courses", "id", course_id, data)
    cache_delete(key_course(course_id))
    return row


def create_syllabus(course_id: str, file_path: str, file_name: str, 
                   file_size_bytes: int, page_count: int) -> Dict[str, Any]:
    """Create a syllabus entry for a course."""
    data = {
        "course_id": course_id,
        "file_path": file_path,
        "file_name": file_name,
        "file_size_bytes": file_size_bytes,
        "page_count": page_count,
    }
    return insert_row("syllabi", data)


def get_course_syllabi(course_id: str) -> List[Dict[str, Any]]:
    """Get all syllabi for a course."""
    return read_rows("syllabi", query={"course_id": course_id})


def get_syllabus(syllabus_id: str) -> Dict[str, Any]:
    """Get a single syllabus by ID."""
    rows = read_rows("syllabi", query={"id": syllabus_id})
    return rows[0] if rows else None


def delete_syllabus(syllabus_id: str) -> None:
    """Delete a syllabus."""
    delete_row("syllabi", "id", syllabus_id)


def update_syllabus(syllabus_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update a syllabus."""
    data["updated_at"] = datetime.utcnow().isoformat()
    return update_row("syllabi", "id", syllabus_id, data)


__all__ = [
    "create_course",
    "get_user_courses",
    "get_course",
    "delete_course",
    "update_course",
    "create_syllabus",
    "get_course_syllabi",
    "get_syllabus",
    "delete_syllabus",
    "update_syllabus",
]

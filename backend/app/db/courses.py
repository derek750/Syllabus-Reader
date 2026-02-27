from typing import Any, Dict, List, Optional
import os
from datetime import datetime
from .supabase_client import insert_row, read_rows, update_row, delete_row


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
    return insert_row("courses", data)


def get_user_courses(user_id: str) -> List[Dict[str, Any]]:
    """Get all courses for a user."""
    return read_rows("courses", query={"user_id": user_id})


def get_course(course_id: str) -> Dict[str, Any]:
    """Get a single course by ID."""
    rows = read_rows("courses", query={"id": course_id})
    return rows[0] if rows else None


def delete_course(course_id: str) -> None:
    """Delete a course and all associated syllabi."""
    delete_row("courses", "id", course_id)


def update_course(course_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update a course."""
    data["updated_at"] = datetime.utcnow().isoformat()
    return update_row("courses", "id", course_id, data)


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

from typing import Any, Dict, Optional
from pydantic import BaseModel


class IDTokenRequest(BaseModel):
    id_token: str
    audience: str | None = None


class InsertRequest(BaseModel):
    data: Dict[str, Any]


class CreateCourseRequest(BaseModel):
    course_name: str
    course_code: Optional[str] = None
    semester: Optional[str] = None
    instructor: Optional[str] = None


class UpdateCourseRequest(BaseModel):
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    semester: Optional[str] = None
    instructor: Optional[str] = None


class CreateAssignmentRequest(BaseModel):
    name: str
    due_date: str
    worth: float
    extra_info: Optional[str] = None


class UpdateAssignmentRequest(BaseModel):
    name: Optional[str] = None
    due_date: Optional[str] = None
    worth: Optional[float] = None
    extra_info: Optional[str] = None


__all__ = [
    "IDTokenRequest",
    "InsertRequest",
    "CreateCourseRequest",
    "UpdateCourseRequest",
    "CreateAssignmentRequest",
    "UpdateAssignmentRequest",
]

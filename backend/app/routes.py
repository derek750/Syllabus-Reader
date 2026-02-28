from fastapi import APIRouter, HTTPException, Request, UploadFile, File
import os

from .auth.google_auth import verify_google_id_token, get_or_create_user_by_email
from .db import supabase_client
from .db.courses import (
    create_course,
    get_user_courses,
    get_course,
    delete_course,
    update_course,
    create_syllabus,
    get_course_syllabi,
    get_syllabus,
    delete_syllabus,
    update_syllabus,
)
from .db.assignments import (
    create_assignment,
    get_course_assignments,
    get_assignment,
    update_assignment as update_assignment_row,
    delete_assignment,
)
from .db.pdf_storage import (
    upload_syllabus_pdf,
    get_syllabus_pdf_url,
    delete_syllabus_pdf,
    download_syllabus_pdf,
)
from .datastructure import (
    IDTokenRequest,
    InsertRequest,
    CreateCourseRequest,
    UpdateCourseRequest,
    CreateAssignmentRequest,
    UpdateAssignmentRequest,
)
from .ai.assignment_extractor import extract_assignments_from_syllabus_pdf
router = APIRouter(prefix="/api")


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


# Course endpoints

@router.post("/courses")
async def create_new_course(user_id: str, request: CreateCourseRequest):
    """Create a new course for the user."""
    try:
        course = create_course(
            user_id=user_id,
            course_name=request.course_name,
            course_code=request.course_code,
            semester=request.semester,
            instructor=request.instructor
        )
        return {"success": True, "course": course}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses")
async def get_courses(user_id: str):
    """Get all courses for the user."""
    try:
        courses = get_user_courses(user_id)
        return {"success": True, "courses": courses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses/{course_id}")
async def get_course_details(course_id: str):
    """Get details for a specific course, including syllabi with download URLs."""
    try:
        course = get_course(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        syllabi = get_course_syllabi(course_id)
        # Attach download URLs for each syllabus
        for syllabus in syllabi:
            syllabus["download_url"] = get_syllabus_pdf_url(syllabus["file_path"])
        return {"success": True, "course": course, "syllabi": syllabi}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/courses/{course_id}")
async def update_course_details(course_id: str, request: UpdateCourseRequest):
    """Update course details."""
    try:
        # Filter out None values
        data = {k: v for k, v in request.dict().items() if v is not None}
        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        course = update_course(course_id, data)
        return {"success": True, "course": course}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/courses/{course_id}")
async def delete_course_endpoint(course_id: str):
    try:
        delete_course(course_id)
        return {"success": True, "message": "Course deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Assignment endpoints


@router.get("/courses/{course_id}/assignments")
async def list_course_assignments(course_id: str):
    """Get all assignments for a course."""
    try:
        course = get_course(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        assignments = get_course_assignments(course_id)
        return {"success": True, "assignments": assignments}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/courses/{course_id}/assignments")
async def create_course_assignment(course_id: str, request: CreateAssignmentRequest):
    """Create a new assignment for a course."""
    try:
        course = get_course(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        assignment = create_assignment(
            course_id=course_id,
            name=request.name,
            due_date=request.due_date,
            worth=request.worth,
            extra_info=request.extra_info,
            location=request.location,
            grade=request.grade,
        )
        return {"success": True, "assignment": assignment}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assignments/{assignment_id}")
async def get_assignment_details(assignment_id: str):
    """Get details for a specific assignment."""
    try:
        assignment = get_assignment(assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return {"success": True, "assignment": assignment}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/assignments/{assignment_id}")
async def update_assignment_details(
    assignment_id: str, request: UpdateAssignmentRequest
):
    """Update assignment details."""
    try:
        data = {k: v for k, v in request.dict().items() if v is not None}
        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")

        assignment = update_assignment_row(assignment_id, data)
        return {"success": True, "assignment": assignment}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/assignments/{assignment_id}")
async def delete_assignment_endpoint(assignment_id: str):
    """Delete an assignment."""
    try:
        assignment = get_assignment(assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")

        delete_assignment(assignment_id)
        return {"success": True, "message": "Assignment deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Syllabus endpoints

@router.post("/courses/{course_id}/syllabus")
async def upload_syllabus(course_id: str, file: UploadFile = File(...)):
    """Upload a syllabus PDF for a course."""
    try:
        # Verify course exists
        course = get_course(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Read file content
        content = await file.read()
        
        # Upload to storage and get metadata
        upload_result = upload_syllabus_pdf(course_id, content, file.filename)
        
        # Create syllabus entry in database
        syllabus = create_syllabus(
            course_id=course_id,
            file_path=upload_result["file_path"],
            file_name=file.filename,
            file_size_bytes=upload_result["file_size_bytes"],
            page_count=upload_result["page_count"]
        )
        
        return {
            "success": True,
            "syllabus": syllabus,
            "download_url": get_syllabus_pdf_url(upload_result["file_path"])
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses/{course_id}/syllabi")
async def list_course_syllabi(course_id: str):
    """Get all syllabi for a course."""
    try:
        course = get_course(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        syllabi = get_course_syllabi(course_id)
        # Add download URLs to each syllabus
        for syllabus in syllabi:
            syllabus["download_url"] = get_syllabus_pdf_url(syllabus["file_path"])
        
        return {"success": True, "syllabi": syllabi}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/syllabi/{syllabus_id}")
async def get_syllabus_details(syllabus_id: str):
    """Get details for a specific syllabus."""
    try:
        syllabus = get_syllabus(syllabus_id)
        if not syllabus:
            raise HTTPException(status_code=404, detail="Syllabus not found")
        
        syllabus["download_url"] = get_syllabus_pdf_url(syllabus["file_path"])
        return {"success": True, "syllabus": syllabus}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/syllabi/{syllabus_id}")
async def delete_syllabus_endpoint(syllabus_id: str):
    """Delete a syllabus."""
    try:
        syllabus = get_syllabus(syllabus_id)
        if not syllabus:
            raise HTTPException(status_code=404, detail="Syllabus not found")
        
        # Delete from storage
        delete_syllabus_pdf(syllabus["file_path"])
        
        # Delete from database
        delete_syllabus(syllabus_id)
        
        return {"success": True, "message": "Syllabus deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/syllabi/{syllabus_id}/extract-assignments")
async def extract_assignments_from_syllabus(syllabus_id: str):
    try:
        syllabus = get_syllabus(syllabus_id)
        if not syllabus:
            raise HTTPException(status_code=404, detail="Syllabus not found")

        pdf_bytes = download_syllabus_pdf(syllabus["file_path"])
        assignments = extract_assignments_from_syllabus_pdf(pdf_bytes)

        return {
            "success": True,
            "assignments": assignments,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

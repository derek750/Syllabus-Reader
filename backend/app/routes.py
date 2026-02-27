from fastapi import APIRouter

router = APIRouter(prefix="/api")


@router.get("/health")
def health_check():
    return {"status": "ok"}


@router.get("/courses")
def list_courses():
    # Placeholder example response
    return [{"id": 1, "name": "Example Course", "instructor": "Prof. Example"}]

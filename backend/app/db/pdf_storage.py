import os
from typing import Optional, BinaryIO
import io
import PyPDF2
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

try:
    from supabase import create_client
    _client = None
    if SUPABASE_URL and SUPABASE_KEY:
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception:
    _client = None


def _ensure_storage_client():
    """Ensure Supabase storage client is initialized."""
    if _client is None:
        raise RuntimeError(
            "Supabase client is not initialized. Set SUPABASE_URL and SUPABASE_KEY in env."
        )


def upload_syllabus_pdf(course_id: str, file_content: bytes, file_name: str) -> dict:
    """
    Upload a PDF syllabus to Supabase Storage.
    Returns file path, page count, and file size.
    """
    _ensure_storage_client()

    # Validate it's a PDF
    if not file_name.lower().endswith(".pdf"):
        raise ValueError("File must be a PDF")

    # Get page count
    try:
        pdf_stream = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_stream)
        page_count = len(pdf_reader.pages)
    except Exception as e:
        raise ValueError(f"Invalid PDF file: {e}")

    # Create a file path: syllabi/{course_id}/{filename}
    file_path = f"syllabi/{course_id}/{file_name}"

    # Upload to Supabase Storage
    try:
        _client.storage.from_("syllabus-storage").upload(
            file_path,
            file_content,
            {"content-type": "application/pdf"},
        )

        return {
            "file_path": file_path,
            "page_count": page_count,
            "file_size_bytes": len(file_content),
        }
    except Exception as e:
        raise RuntimeError(f"Failed to upload PDF: {e}")


def get_syllabus_pdf_url(file_path: str) -> str:
    """Get the public URL for a syllabus PDF from Supabase."""
    _ensure_storage_client()
    try:
        url = _client.storage.from_("syllabus-storage").get_public_url(file_path)
        return url
    except Exception as e:
        raise RuntimeError(f"Failed to get public URL: {e}")


def delete_syllabus_pdf(file_path: str) -> None:
    """Delete a syllabus PDF from Supabase Storage."""
    _ensure_storage_client()
    try:
        _client.storage.from_("syllabus-storage").remove([file_path])
    except Exception as e:
        raise RuntimeError(f"Failed to delete PDF: {e}")


__all__ = ["upload_syllabus_pdf", "get_syllabus_pdf_url", "delete_syllabus_pdf"]

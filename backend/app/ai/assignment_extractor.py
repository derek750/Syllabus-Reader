import io
import json
import os
from typing import Any, Dict, List

import PyPDF2
import google as genai


GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")


def _get_gemini_model():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is not set. "
            "Set it to a valid Gemini API key."
        )

    genai.Client(api_key=api_key)
    return genai.Client(GEMINI_MODEL_NAME)


def _parse_json_response(raw: str) -> List[Dict[str, Any]]:
    """
    Try to parse the Gemini response as JSON, being tolerant of code fences.
    Returns a list of assignment dictionaries.
    """
    text = raw.strip()

    # Strip Markdown code fences if present
    if text.startswith("```"):
        # Remove opening fence and optional language hint
        text = text.split("```", 1)[1]
        # Remove closing fence if present
        if "```" in text:
            text = text.rsplit("```", 1)[0]
        text = text.strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []

    if isinstance(data, dict) and "assignments" in data:
        assignments = data.get("assignments", [])
    else:
        assignments = data if isinstance(data, list) else []

    # Ensure each item is a dict
    normalized: List[Dict[str, Any]] = []
    for item in assignments:
        if isinstance(item, dict):
            normalized.append(item)
    return normalized


def extract_assignments_from_text(text: str) -> List[Dict[str, Any]]:
    """
    Use Gemini to extract assignment information from syllabus text.

    Returns a list of dictionaries with keys:
    - name: str
    - due_date: str (ISO date if possible, otherwise empty)
    - worth: float or int percentage if available, otherwise null
    - extra_info: str
    """
    if not text.strip():
        return []

    model = _get_gemini_model()

    system_instructions = (
        "You are an assistant that reads university course syllabi and extracts "
        "all graded assignments (e.g., homework, projects, exams, quizzes, labs, "
        "presentations, papers). "
        "You must respond ONLY with JSON, no explanations."
    )

    user_prompt = (
        "From the following syllabus text, extract all graded assignments.\n\n"
        "For each assignment, include:\n"
        "- name: a short descriptive title\n"
        "- due_date: the due date in ISO format YYYY-MM-DD if you can infer it, "
        "otherwise an empty string\n"
        "- worth: the percentage of the final grade as a number only (e.g. 15 for "
        "15%), or null if not specified\n"
        "- extra_info: any additional useful details (e.g., description, page "
        'range, milestone info).\n\n'
        "Return JSON ONLY in one of these forms:\n"
        '1) A top-level array of assignment objects, OR\n'
        '2) An object {\"assignments\": [...]}.\n\n'
        "Syllabus text starts below this line:\n"
        "----------------------------------------\n"
        f"{text}\n"
        "----------------------------------------\n"
    )

    response = model.generate_content(
        [
            system_instructions,
            user_prompt,
        ]
    )

    raw_text = response.text or ""
    assignments = _parse_json_response(raw_text)

    # Normalize fields
    normalized: List[Dict[str, Any]] = []
    for item in assignments:
        name = str(item.get("name", "")).strip()
        if not name:
            continue

        due_date = str(item.get("due_date", "") or "").strip()

        worth = item.get("worth")
        if isinstance(worth, str):
            worth_str = worth.strip().replace("%", "")
            try:
                worth = float(worth_str) if worth_str else None
            except ValueError:
                worth = None
        elif isinstance(worth, (int, float)):
            worth = float(worth)
        else:
            worth = None

        extra_info = str(item.get("extra_info", "") or "").strip()

        normalized.append(
            {
                "name": name,
                "due_date": due_date,
                "worth": worth,
                "extra_info": extra_info,
            }
        )

    return normalized


def extract_assignments_from_syllabus_pdf(pdf_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Read a syllabus PDF (as bytes), extract text with PyPDF2,
    and then use Gemini to extract assignments.
    """
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
    except Exception as exc:
        raise ValueError(f"Failed to read PDF: {exc}")

    pages_text: List[str] = []
    for page in reader.pages:
        try:
            page_text = page.extract_text() or ""
        except Exception:
            page_text = ""
        pages_text.append(page_text)

    full_text = "\n\n".join(pages_text)
    return extract_assignments_from_text(full_text)


__all__ = [
    "extract_assignments_from_text",
    "extract_assignments_from_syllabus_pdf",
]


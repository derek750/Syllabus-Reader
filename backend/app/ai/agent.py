"""
LangChain AI agent powered by Google Gemini.

Can create and edit courses and assignments when given a user_id (e.g. from the authenticated user).
Uses GEMINI_API_KEY (or GOOGLE_API_KEY) and optional GEMINI_MODEL_NAME from environment.
"""

import json
import os
from typing import Optional

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI

from app.db.courses import (
    create_course as db_create_course,
    get_user_courses,
    get_course as db_get_course,
    update_course as db_update_course,
)
from app.db.assignments import (
    create_assignment as db_create_assignment,
    get_course_assignments,
    get_assignment as db_get_assignment,
    update_assignment as db_update_assignment,
)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")
API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

# ---------------------------------------------------------------------------
# LLM
# ---------------------------------------------------------------------------

llm = ChatGoogleGenerativeAI(
    model=GEMINI_MODEL_NAME,
    api_key=API_KEY,
    temperature=0,
)

# ---------------------------------------------------------------------------
# Tools (extend with your own)
# ---------------------------------------------------------------------------


@tool
def get_current_date() -> str:
    """Returns the current date in YYYY-MM-DD format. Use when the user asks about today's date."""
    from datetime import date

    return date.today().isoformat()


@tool
def get_current_time() -> str:
    """Returns the current time in HH:MM (24-hour). Use when the user asks what time it is."""
    from datetime import datetime

    return datetime.now().strftime("%H:%M")


# --- Course tools (require user_id from the conversation context) ---


@tool
def list_courses(user_id: str) -> str:
    """List all courses for the given user. user_id is the authenticated user's ID (UUID)."""
    try:
        courses = get_user_courses(user_id)
        return json.dumps([{"id": c.get("id"), "course_name": c.get("course_name"), "course_code": c.get("course_code"), "semester": c.get("semester"), "instructor": c.get("instructor")} for c in courses], indent=2)
    except Exception as e:
        return f"Error listing courses: {e}"


@tool
def create_course(
    user_id: str,
    course_name: str,
    course_code: Optional[str] = None,
    semester: Optional[str] = None,
    instructor: Optional[str] = None,
) -> str:
    """Create a new course for the user. user_id is the authenticated user's ID. course_name is required."""
    try:
        course = db_create_course(
            user_id=user_id,
            course_name=course_name,
            course_code=course_code or None,
            semester=semester or None,
            instructor=instructor or None,
        )
        return json.dumps({"success": True, "course": {"id": course.get("id"), "course_name": course.get("course_name"), "course_code": course.get("course_code"), "semester": course.get("semester"), "instructor": course.get("instructor")}})
    except Exception as e:
        return f"Error creating course: {e}"


@tool
def get_course(course_id: str) -> str:
    """Get a single course by ID. Use to verify a course exists or show its details."""
    try:
        course = db_get_course(course_id)
        if not course:
            return json.dumps({"error": "Course not found", "course_id": course_id})
        return json.dumps({"id": course.get("id"), "course_name": course.get("course_name"), "course_code": course.get("course_code"), "semester": course.get("semester"), "instructor": course.get("instructor")})
    except Exception as e:
        return f"Error getting course: {e}"


@tool
def update_course(
    course_id: str,
    course_name: Optional[str] = None,
    course_code: Optional[str] = None,
    semester: Optional[str] = None,
    instructor: Optional[str] = None,
) -> str:
    """Update an existing course. Only include fields you want to change. course_id is required."""
    try:
        data = {}
        if course_name is not None:
            data["course_name"] = course_name
        if course_code is not None:
            data["course_code"] = course_code
        if semester is not None:
            data["semester"] = semester
        if instructor is not None:
            data["instructor"] = instructor
        if not data:
            return json.dumps({"error": "No fields to update"})
        course = db_update_course(course_id, data)
        return json.dumps({"success": True, "course": {"id": course.get("id"), "course_name": course.get("course_name"), "course_code": course.get("course_code"), "semester": course.get("semester"), "instructor": course.get("instructor")}})
    except Exception as e:
        return f"Error updating course: {e}"


# --- Assignment tools ---


@tool
def list_assignments(course_id: str, include_archived: bool = False) -> str:
    """List all assignments for a course. Use course_id from a course. Set include_archived to True to include archived assignments."""
    try:
        assignments = get_course_assignments(course_id, include_archived=include_archived)
        return json.dumps(
            [
                {
                    "id": a.get("id"),
                    "name": a.get("name"),
                    "due_date": a.get("due_date"),
                    "due_time": a.get("due_time"),
                    "worth": a.get("worth"),
                    "extra_info": a.get("extra_info"),
                    "location": a.get("location"),
                    "grade": a.get("grade"),
                    "archived": a.get("archived"),
                }
                for a in assignments
            ],
            indent=2,
        )
    except Exception as e:
        return f"Error listing assignments: {e}"


@tool
def create_assignment(
    course_id: str,
    name: str,
    due_date: Optional[str] = None,
    due_time: Optional[str] = None,
    worth: float = 0,
    extra_info: Optional[str] = None,
    location: Optional[str] = None,
    grade: Optional[float] = None,
    archived: bool = False,
) -> str:
    """Create a new assignment for a course. name is required. due_date format YYYY-MM-DD, due_time format HH:mm or HH:mm:ss. worth is percentage of grade (e.g. 15 for 15%). archived defaults to False."""
    try:
        w = float(worth) if worth is not None else 0.0
        assignment = db_create_assignment(
            course_id=course_id,
            name=name,
            due_date=due_date.strip() if due_date and str(due_date).strip() else None,
            due_time=due_time.strip() if due_time and str(due_time).strip() else None,
            worth=w,
            extra_info=extra_info or None,
            location=location or None,
            grade=grade,
            archived=archived,
        )
        return json.dumps(
            {
                "success": True,
                "assignment": {
                    "id": assignment.get("id"),
                    "name": assignment.get("name"),
                    "due_date": assignment.get("due_date"),
                    "due_time": assignment.get("due_time"),
                    "worth": assignment.get("worth"),
                    "extra_info": assignment.get("extra_info"),
                    "location": assignment.get("location"),
                    "grade": assignment.get("grade"),
                },
            }
        )
    except Exception as e:
        return f"Error creating assignment: {e}"


@tool
def get_assignment(assignment_id: str) -> str:
    """Get a single assignment by ID. Use to verify an assignment exists or show its details."""
    try:
        assignment = db_get_assignment(assignment_id)
        if not assignment:
            return json.dumps({"error": "Assignment not found", "assignment_id": assignment_id})
        return json.dumps(
            {
                "id": assignment.get("id"),
                "course_id": assignment.get("course_id"),
                "name": assignment.get("name"),
                "due_date": assignment.get("due_date"),
                "due_time": assignment.get("due_time"),
                "worth": assignment.get("worth"),
                "extra_info": assignment.get("extra_info"),
                "location": assignment.get("location"),
                "grade": assignment.get("grade"),
                "archived": assignment.get("archived"),
            }
        )
    except Exception as e:
        return f"Error getting assignment: {e}"


@tool
def update_assignment(
    assignment_id: str,
    name: Optional[str] = None,
    due_date: Optional[str] = None,
    due_time: Optional[str] = None,
    worth: Optional[float] = None,
    extra_info: Optional[str] = None,
    location: Optional[str] = None,
    grade: Optional[float] = None,
    archived: Optional[bool] = None,
) -> str:
    """Update an existing assignment. Only include fields you want to change. assignment_id is required. Use empty string for due_date to clear it."""
    try:
        data = {}
        if name is not None:
            data["name"] = name
        if due_date is not None:
            data["due_date"] = due_date.strip() if str(due_date).strip() else None
        if due_time is not None:
            data["due_time"] = due_time.strip() if str(due_time).strip() else None
        if worth is not None:
            data["worth"] = float(worth)
        if extra_info is not None:
            data["extra_info"] = extra_info
        if location is not None:
            data["location"] = location
        if grade is not None:
            data["grade"] = grade
        if archived is not None:
            data["archived"] = archived
        if not data:
            return json.dumps({"error": "No fields to update"})
        assignment = db_update_assignment(assignment_id, data)
        return json.dumps(
            {
                "success": True,
                "assignment": {
                    "id": assignment.get("id"),
                    "name": assignment.get("name"),
                    "due_date": assignment.get("due_date"),
                    "due_time": assignment.get("due_time"),
                    "worth": assignment.get("worth"),
                    "grade": assignment.get("grade"),
                },
            }
        )
    except Exception as e:
        return f"Error updating assignment: {e}"


# ---------------------------------------------------------------------------
# Agent (LangChain create_agent — built on LangGraph)
# ---------------------------------------------------------------------------

TOOLS = [
    get_current_date,
    get_current_time,
    list_courses,
    create_course,
    get_course,
    update_course,
    list_assignments,
    create_assignment,
    get_assignment,
    update_assignment,
]

SYSTEM_PROMPT = (
    "You are a helpful assistant for a syllabus reader app. "
    "You can create and edit courses and assignments for the user. "
    "When the user asks you to do something, use the current user_id they provide when listing or creating courses. "
    "Be concise and confirm what you did."
)

agent_graph = create_agent(
    model=llm,
    tools=TOOLS,
    system_prompt=SYSTEM_PROMPT,
)


def _messages_input(user_input: str, user_id: str):
    """Build the message list with user_id context."""
    prompt = f"Current user_id (use this when listing or creating courses): {user_id}\n\nUser request: {user_input}"
    return [HumanMessage(content=prompt)]


def _extract_response(result: dict) -> str:
    """Get the final AI response text from the agent state."""
    messages = result.get("messages") or []
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and getattr(msg, "content", None):
            return msg.content if isinstance(msg.content, str) else str(msg.content)
    return ""


def run_agent(user_input: str, user_id: str) -> str:
    """
    Run the agent with the given user input.
    user_id: the authenticated user's ID (used for listing/creating courses).
    Returns the final answer string.
    """
    if not API_KEY:
        return "Error: GEMINI_API_KEY or GOOGLE_API_KEY must be set."
    result = agent_graph.invoke({"messages": _messages_input(user_input, user_id)})
    return _extract_response(result)


async def run_agent_async(user_input: str, user_id: str) -> str:
    """Async version of run_agent. user_id is the authenticated user's ID."""
    if not API_KEY:
        return "Error: GEMINI_API_KEY or GOOGLE_API_KEY must be set."
    result = await agent_graph.ainvoke({"messages": _messages_input(user_input, user_id)})
    return _extract_response(result)


__all__ = [
    "run_agent",
    "run_agent_async",
    "agent_graph",
    "llm",
    "TOOLS",
]

"""
LangChain AI agent powered by Google Gemini.

The agent proposes changes (create/update courses and assignments) and returns a summary
for user approval. No changes are applied until the user approves via execute_plan.
Uses GEMINI_API_KEY (or GOOGLE_API_KEY) and optional GEMINI_MODEL_NAME from environment.
"""

import json
import os
from typing import Any, Dict, List, Optional

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

# Prefix for tool output that carries a pending plan (summary + actions) for approval
PLAN_PREFIX = "PLAN:"

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
def get_course(course_id: str) -> str:
    """Get a single course by ID. Use to verify a course exists or show its details."""
    try:
        course = db_get_course(course_id)
        if not course:
            return json.dumps({"error": "Course not found", "course_id": course_id})
        return json.dumps({"id": course.get("id"), "course_name": course.get("course_name"), "course_code": course.get("course_code"), "semester": course.get("semester"), "instructor": course.get("instructor")})
    except Exception as e:
        return f"Error getting course: {e}"


# --- Proposal tool (no DB writes; returns a plan for user approval) ---


@tool
def propose_changes(summary: str, actions_json: str) -> str:
    """Submit a proposed set of changes for the user to approve. Call this INSTEAD of creating or updating anything directly.
    summary: A short human-readable summary of what you will do (e.g. 'Create course Math 101 and add assignment HW1 worth 10%').
    actions_json: A JSON array of actions. Each action is an object with 'type' and 'params'.
    Allowed types and their params:
    - create_course: { course_name (required), course_code?, semester?, instructor? }
    - update_course: { course_id (required), course_name?, course_code?, semester?, instructor? }
    - create_assignment: { course_id (required), name (required), due_date?, due_time?, worth?, extra_info?, location?, grade? }. For a course created in the SAME plan, use course_id "__ref:0" for the first action's new course, "__ref:1" for the second, etc. (new assignments are never archived)
    - update_assignment: { assignment_id (required), name?, due_date?, due_time?, worth?, extra_info?, location?, grade?, archived? }
    Use the current user_id from the conversation only when listing or when you need to reference the user; do NOT include user_id in params (it is added when executing).
    Return the plan so the user can approve or reject before any changes are made."""
    try:
        actions = json.loads(actions_json)
        if not isinstance(actions, list):
            return json.dumps({"error": "actions_json must be a JSON array"})
        out = {"summary": summary.strip(), "actions": actions}
        return PLAN_PREFIX + json.dumps(out)
    except json.JSONDecodeError as e:
        return json.dumps({"error": f"Invalid actions_json: {e}"})


# --- Assignment tools (read-only for agent) ---


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


# ---------------------------------------------------------------------------
# Agent (LangChain create_agent — built on LangGraph)
# ---------------------------------------------------------------------------

TOOLS = [
    get_current_date,
    get_current_time,
    list_courses,
    get_course,
    list_assignments,
    get_assignment,
    propose_changes,
]

SYSTEM_PROMPT = (
    "You are a helpful assistant for a syllabus reader app. "
    "You can propose creating or editing courses and assignments. "
    "You must NEVER create or update anything directly. Instead, use the propose_changes tool with a clear summary and a JSON array of actions (create_course, update_course, create_assignment, update_assignment). "
    "When creating a course and then an assignment for that same course in one plan, put create_course first and use course_id \"__ref:0\" in create_assignment to mean 'the course created by the first action'. Use __ref:1 for the second action's new course, etc. "
    "Use the current user_id only when listing courses or when you need to reference the user. "
    "After calling propose_changes, tell the user what you proposed and that they can approve or reject it."
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


def _extract_pending_plan(result: dict) -> Optional[Dict[str, Any]]:
    """If the agent called propose_changes, extract { summary, actions } from the last plan in messages."""
    messages = result.get("messages") or []
    for msg in reversed(messages):
        content = getattr(msg, "content", None)
        if isinstance(content, str) and content.startswith(PLAN_PREFIX):
            try:
                data = json.loads(content[len(PLAN_PREFIX) :].strip())
                if isinstance(data, dict) and "summary" in data and "actions" in data:
                    return {"summary": data["summary"], "actions": data["actions"]}
            except json.JSONDecodeError:
                continue
    return None


def run_agent(user_input: str, user_id: str) -> Dict[str, Any]:
    """
    Run the agent with the given user input.
    Returns {"response": str, "pending_plan": { "summary", "actions" } | None }.
    """
    if not API_KEY:
        return {"response": "Error: GEMINI_API_KEY or GOOGLE_API_KEY must be set.", "pending_plan": None}
    result = agent_graph.invoke({"messages": _messages_input(user_input, user_id)})
    return {
        "response": _extract_response(result),
        "pending_plan": _extract_pending_plan(result),
    }


async def run_agent_async(user_input: str, user_id: str) -> Dict[str, Any]:
    """Async version of run_agent. Returns { response, pending_plan }."""
    if not API_KEY:
        return {"response": "Error: GEMINI_API_KEY or GOOGLE_API_KEY must be set.", "pending_plan": None}
    result = await agent_graph.ainvoke({"messages": _messages_input(user_input, user_id)})
    return {
        "response": _extract_response(result),
        "pending_plan": _extract_pending_plan(result),
    }


def execute_plan(user_id: str, plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply an approved plan: run each action (create_course, update_course, create_assignment, update_assignment).
    plan must have "actions": [ { "type": str, "params": dict }, ... ].
    Returns { "success": True, "results": [...] } or { "success": False, "error": str }.
    """
    actions = plan.get("actions")
    if not isinstance(actions, list) or not actions:
        return {"success": False, "error": "No actions in plan"}
    results: List[Dict[str, Any]] = []

    def _resolve_course_id(course_id: Any, results_so_far: List[Dict[str, Any]], current_index: int) -> Optional[str]:
        """Resolve course_id: __ref:N -> id from action N; or if empty and previous action created a course, use that."""
        s = None if course_id is None else str(course_id).strip()
        if s:
            if s.startswith("__ref:"):
                try:
                    n = int(s.split(":", 1)[1].strip())
                except (ValueError, IndexError):
                    pass
                else:
                    if 0 <= n < len(results_so_far):
                        r = results_so_far[n].get("result")
                        if isinstance(r, dict) and r.get("id"):
                            return str(r["id"])
            else:
                return s
        # Fallback: if this is create_assignment and the previous action was create_course, use that course's id
        if current_index > 0 and len(results_so_far) >= current_index:
            prev = results_so_far[current_index - 1]
            if prev.get("type") == "create_course":
                r = prev.get("result")
                if isinstance(r, dict) and r.get("id"):
                    return str(r["id"])
        return None

    for i, action in enumerate(actions):
        if not isinstance(action, dict):
            results.append({"index": i, "error": "Invalid action shape"})
            continue
        typ = action.get("type")
        params = action.get("params") or {}
        if not isinstance(params, dict):
            params = {}
        try:
            if typ == "create_course":
                course = db_create_course(
                    user_id=user_id,
                    course_name=params.get("course_name") or "",
                    course_code=params.get("course_code"),
                    semester=params.get("semester"),
                    instructor=params.get("instructor"),
                )
                results.append({"index": i, "type": typ, "result": course})
            elif typ == "update_course":
                course_id = params.get("course_id")
                if not course_id:
                    results.append({"index": i, "error": "update_course requires course_id"})
                    continue
                data = {k: v for k, v in params.items() if k != "course_id" and v is not None}
                if not data:
                    results.append({"index": i, "error": "No fields to update"})
                    continue
                course = db_update_course(str(course_id), data)
                results.append({"index": i, "type": typ, "result": course})
            elif typ == "create_assignment":
                raw_course_id = params.get("course_id")
                course_id = _resolve_course_id(raw_course_id, results, i)
                name = params.get("name") or ""
                if not course_id or not name:
                    results.append({
                        "index": i,
                        "error": "create_assignment requires course_id and name (use __ref:0 for the course created in the first action of this plan)",
                    })
                    continue
                due_date = params.get("due_date")
                due_time = params.get("due_time")
                if due_date is not None and not isinstance(due_date, str):
                    due_date = str(due_date)
                if due_time is not None and not isinstance(due_time, str):
                    due_time = str(due_time)
                due_date = due_date.strip() if (due_date and str(due_date).strip()) else None
                due_time = due_time.strip() if (due_time and str(due_time).strip()) else None
                worth = float(params.get("worth") or 0)
                assignment = db_create_assignment(
                    course_id=course_id,
                    name=name,
                    due_date=due_date,
                    due_time=due_time,
                    worth=worth,
                    extra_info=params.get("extra_info"),
                    location=params.get("location"),
                    grade=params.get("grade"),
                    archived=False,  # New assignments are always not archived
                )
                results.append({"index": i, "type": typ, "result": assignment})
            elif typ == "update_assignment":
                assignment_id = params.get("assignment_id")
                if not assignment_id:
                    results.append({"index": i, "error": "update_assignment requires assignment_id"})
                    continue
                data = {}
                for key in ("name", "due_date", "due_time", "worth", "extra_info", "location", "grade", "archived"):
                    if key in params and params[key] is not None:
                        if key == "due_date" and str(params[key]).strip() == "":
                            data[key] = None
                        elif key == "due_time" and str(params[key]).strip() == "":
                            data[key] = None
                        else:
                            data[key] = params[key]
                if "worth" in data:
                    data["worth"] = float(data["worth"])
                if not data:
                    results.append({"index": i, "error": "No fields to update"})
                    continue
                assignment = db_update_assignment(assignment_id, data)
                results.append({"index": i, "type": typ, "result": assignment})
            else:
                results.append({"index": i, "error": f"Unknown action type: {typ}"})
        except Exception as e:
            results.append({"index": i, "type": typ, "error": str(e)})
    return {"success": True, "results": results}


__all__ = [
    "run_agent",
    "run_agent_async",
    "execute_plan",
    "agent_graph",
    "llm",
    "TOOLS",
]

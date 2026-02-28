import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/store";

const COURSE_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4",
];
function colorForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COURSE_COLORS[h % COURSE_COLORS.length];
}
import { Button } from "@/components/Button";
import { parseAssignmentDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/Card";
import { Input } from "@/components/Input";
import { Modal, ModalHeader, ModalTitle } from "@/components/Modal";
import { Select } from "@/components/Select";
import { cn } from "@/lib/utils";
import type { Event } from "@/types";

const API_BASE = "http://localhost:8000/api";

interface Assignment {
  id: string;
  course_id: string;
  name: string;
  due_date: string;
  worth: number;
  extra_info?: string | null;
  location?: string | null;
  grade?: number | null;
  created_at: string;
}

type CalendarItem =
  | (Event & { source: "event" })
  | {
      id: string;
      course_id: string;
      type: string;
      title: string;
      description: string | null;
      event_date: string;
      source: "assignment";
      grade?: number | null;
    };

const EVENT_TYPES = ["exam", "assignment", "reading", "event"] as const;
const TYPE_COLORS: Record<string, string> = {
  exam: "bg-destructive/20 text-destructive border-destructive/30",
  assignment: "bg-orange-100 text-orange-700 border-orange-200",
  reading: "bg-green-100 text-green-700 border-green-200",
  event: "bg-primary/10 text-primary border-primary/20",
};
const TYPE_EMOJI: Record<string, string> = {
  exam: "🔴",
  assignment: "🟠",
  reading: "🟢",
  event: "🟣",
};

export function CalendarPage() {
  const { courses, setCourses, events, addEvent, deleteEvent } = useStore();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [updatingGradeId, setUpdatingGradeId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    type: "assignment",
    courseId: "",
    description: "",
  });

  const loadCourses = useCallback(async () => {
    try {
      const userRaw = localStorage.getItem("user");
      if (!userRaw) return;
      const parsed = JSON.parse(userRaw);
      const userId = parsed?.id;
      if (!userId) return;
      const res = await fetch(`${API_BASE}/courses?user_id=${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data?.courses) ? data.courses : [];
      const normalized = rows.map((c: { id: string; course_name?: string; name?: string; semester?: string; color?: string; created_at?: string; updated_at?: string }) => ({
        id: String(c.id ?? ""),
        name: String(c.course_name ?? c.name ?? ""),
        semester: c.semester ?? null,
        color: String(c.color ?? colorForId(String(c.id))),
        syllabus_path: null,
        created_at: String(c.created_at ?? new Date().toISOString()),
        updated_at: String(c.updated_at ?? c.created_at ?? new Date().toISOString()),
      }));
      setCourses(normalized);
    } catch {
      // ignore
    }
  }, [setCourses]);

  useEffect(() => {
    if (courses.length === 0) loadCourses();
  }, [courses.length, loadCourses]);

  const loadAssignments = useCallback(async () => {
    if (courses.length === 0) {
      setAssignments([]);
      setAssignmentsLoading(false);
      return;
    }
    setAssignmentsLoading(true);
    try {
      const results = await Promise.all(
        courses.map((c) =>
          fetch(`${API_BASE}/courses/${c.id}/assignments`).then((r) =>
            r.ok ? r.json() : { assignments: [] }
          )
        )
      );
      const all = results.flatMap((d) => d.assignments || []);
      setAssignments(all);
    } catch {
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [courses]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const calendarItems: CalendarItem[] = [
    ...events.map((e) => ({ ...e, source: "event" as const })),
    ...assignments.map((a) => ({
      id: a.id,
      course_id: a.course_id,
      type: "assignment",
      title: a.name,
      description: [
        a.worth ? `Worth ${a.worth}%` : "",
        a.grade != null ? `Grade: ${a.grade}` : "",
        a.location,
        a.extra_info,
      ]
        .filter(Boolean)
        .join(" • ") || null,
      event_date: a.due_date,
      source: "assignment" as const,
      grade: a.grade,
    })),
  ];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const dayEvents = (date: Date) =>
    calendarItems.filter((item) =>
      isSameDay(parseAssignmentDate(item.event_date), date)
    );
  const selectedEvents = selectedDate ? dayEvents(selectedDate) : [];

  const deleteCalendarItem = useCallback(
    async (item: CalendarItem) => {
      if (item.source === "event") {
        deleteEvent(item.id);
      } else {
        try {
          const res = await fetch(`${API_BASE}/assignments/${item.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setAssignments((prev) => prev.filter((a) => a.id !== item.id));
          }
        } catch {
          // ignore
        }
      }
    },
    [deleteEvent]
  );

  const handleUpdateAssignmentGrade = useCallback(
    async (assignmentId: string, gradeValue: string) => {
      const grade = gradeValue.trim() === "" ? null : Number(gradeValue);
      if (
        gradeValue.trim() !== "" &&
        (Number.isNaN(Number(gradeValue)) || grade == null)
      )
        return;
      setUpdatingGradeId(assignmentId);
      try {
        const res = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade }),
        });
        if (res.ok) {
          const data = await res.json();
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === assignmentId
                ? { ...a, grade: data.assignment?.grade ?? grade }
                : a
            )
          );
        }
      } catch {
        // ignore
      } finally {
        setUpdatingGradeId(null);
      }
    },
    []
  );

  const handleAddEvent = () => {
    if (!selectedDate || !newEvent.courseId || !newEvent.title.trim()) return;
    addEvent({
      course_id: newEvent.courseId,
      type: newEvent.type,
      title: newEvent.title.trim(),
      description: newEvent.description.trim() || null,
      event_date: format(selectedDate, "yyyy-MM-dd"),
    });
    setAddOpen(false);
    setNewEvent({ title: "", type: "assignment", courseId: "", description: "" });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground mt-1">View and add events by date</p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map((day) => {
              const de = dayEvents(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative aspect-square flex flex-col items-center justify-start p-1 rounded-lg transition-colors text-sm",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "bg-accent"
                        : "hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "font-medium",
                      !isSameMonth(day, currentMonth) && "opacity-40"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {de.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {de.slice(0, 3).map((e) => {
                        const course = courses.find((c) => c.id === e.course_id);
                        return (
                          <div
                            key={e.id}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: course?.color ?? "#6366f1" }}
                          />
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </h2>
            {courses.length > 0 && (
              <Button size="sm" className="gap-1" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            )}
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {assignmentsLoading ? "Loading assignments..." : "No events on this date."}
            </p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((item) => {
                const course = courses.find((c) => c.id === item.course_id);
                return (
                  <div
                    key={item.source === "assignment" ? `a-${item.id}` : item.id}
                    className={cn(
                      "flex items-center gap-4 rounded-lg border p-4",
                      TYPE_COLORS[item.type]
                    )}
                  >
                    <span>{TYPE_EMOJI[item.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm opacity-70">
                        {course?.name}
                        {item.description ? ` — ${item.description}` : ""}
                      </p>
                    </div>
                    {item.source === "assignment" && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Grade
                        </span>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="—"
                          value={item.grade ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || !Number.isNaN(Number(v))) {
                              setAssignments((prev) =>
                                prev.map((a) =>
                                  a.id === item.id
                                    ? {
                                        ...a,
                                        grade:
                                          v === "" ? null : Number(v),
                                      }
                                    : a
                                )
                              );
                            }
                          }}
                          onBlur={(e) =>
                            handleUpdateAssignmentGrade(item.id, e.target.value)
                          }
                          disabled={updatingGradeId === item.id}
                          className="w-16 h-8 text-sm text-right"
                        />
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteCalendarItem(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal open={addOpen} onOpenChange={setAddOpen}>
        <ModalHeader>
          <ModalTitle>Add event on {selectedDate ? format(selectedDate, "MMM d") : ""}</ModalTitle>
        </ModalHeader>
        <div className="space-y-4">
          <Input
            placeholder="Title"
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          />
          <Select
            value={newEvent.type}
            onValueChange={(v) => setNewEvent({ ...newEvent, type: v })}
            options={EVENT_TYPES.map((t) => ({ value: t, label: `${TYPE_EMOJI[t]} ${t}` }))}
          />
          <Select
            value={newEvent.courseId}
            onValueChange={(v) => setNewEvent({ ...newEvent, courseId: v })}
            options={courses.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select course"
          />
          <Input
            placeholder="Description (optional)"
            value={newEvent.description}
            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
          />
          <Button
            className="w-full"
            disabled={!newEvent.title.trim() || !newEvent.courseId}
            onClick={handleAddEvent}
          >
            Add Event
          </Button>
        </div>
      </Modal>
    </div>
  );
}

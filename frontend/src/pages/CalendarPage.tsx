import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar, BookOpen } from "lucide-react";
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
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal, ModalHeader, ModalTitle } from "@/components/Modal";
import { Select } from "@/components/Select";
import { cn } from "@/lib/utils";
import type { Event } from "@/types";
import { API_BASE } from "@/config";

interface Assignment {
  id: string;
  course_id: string;
  name: string;
  due_date: string | null;
  worth: number;
  extra_info?: string | null;
  location?: string | null;
  grade?: number | null;
  archived?: boolean | null;
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
      worth?: number;
    };

const EVENT_TYPES = ["exam", "assignment", "reading", "event"] as const;
const TYPE_COLORS: Record<string, string> = {
  exam: "bg-destructive/15 text-destructive border-l-destructive",
  assignment: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-l-amber-500",
  reading: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-l-emerald-500",
  event: "bg-primary/10 text-primary border-l-primary",
};
const TYPE_EMOJI: Record<string, string> = {
  exam: "🔴",
  assignment: "🟠",
  reading: "🟢",
  event: "🟣",
};

const MAX_VISIBLE_PER_DAY = 3;

export function CalendarPage() {
  const { courses, setCourses, events, addEvent, deleteEvent } = useStore();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<CalendarItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<CalendarItem | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [dayPopupDate, setDayPopupDate] = useState<Date | null>(null);
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

  useEffect(() => {
    const onPlanExecuted = () => loadCourses();
    window.addEventListener("agent-plan-executed", onPlanExecuted);
    return () => window.removeEventListener("agent-plan-executed", onPlanExecuted);
  }, [loadCourses]);

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
      worth: a.worth,
    })),
  ];

  const hasValidDate = (item: CalendarItem): boolean => {
    const raw = item.event_date;
    if (raw == null || String(raw).trim() === "") return false;
    const d = parseAssignmentDate(item.event_date);
    return !Number.isNaN(d.getTime());
  };

  const calendarItemsWithDate = calendarItems.filter(hasValidDate);

  const filteredItems =
    courseFilter === ""
      ? calendarItemsWithDate
      : calendarItemsWithDate.filter((item) => item.course_id === courseFilter);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  // Always render a 6-week grid (42 days) so short months (e.g. February)
  // still fill the calendar with prior/next month days.
  const gridEnd = addDays(gridStart, 41);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const dayEvents = (date: Date) =>
    filteredItems.filter((item) =>
      isSameDay(parseAssignmentDate(item.event_date), date)
    );

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
      setDetailOpen(false);
      setDetailItem(null);
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
          setDetailItem((prev) =>
            prev && prev.source === "assignment" && prev.id === assignmentId
              ? { ...prev, grade: data.assignment?.grade ?? grade }
              : prev
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
    const date = selectedDate ?? new Date();
    if (!newEvent.courseId || !newEvent.title.trim()) return;
    addEvent({
      course_id: newEvent.courseId,
      type: newEvent.type,
      title: newEvent.title.trim(),
      description: newEvent.description.trim() || null,
      event_date: format(date, "yyyy-MM-dd"),
    });
    setAddOpen(false);
    setNewEvent({ title: "", type: "assignment", courseId: "", description: "" });
  };

  const openDetail = (e: React.MouseEvent, item: CalendarItem) => {
    e.stopPropagation();
    setDetailItem(item);
    setDetailOpen(true);
  };

  const openDayPopup = (date: Date) => {
    setDayPopupDate(date);
  };

  const openAssignmentFromDay = (e: React.MouseEvent, item: CalendarItem) => {
    e.stopPropagation();
    setDayPopupDate(null);
    setDetailItem(item);
    setDetailOpen(true);
  };

  const dayPopupItems = dayPopupDate ? dayEvents(dayPopupDate) : [];

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] min-h-[400px]">
      <div className="flex items-center justify-between gap-4 flex-shrink-0 mb-3">
        <div className="flex items-center gap-3">
          <Select
            value={courseFilter}
            onValueChange={setCourseFilter}
            options={[
              { value: "", label: "View all" },
              ...courses.map((c) => ({ value: c.id, label: c.name })),
            ]}
            placeholder="View course"
            className="w-[200px]"
          />
          {courses.length > 0 && (
            <Button size="sm" className="gap-1" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold font-heading min-w-[160px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardContent className="p-3 md:p-4 flex flex-col flex-1 min-h-0">
          <div className="grid grid-cols-7 gap-px mb-1 flex-shrink-0">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-border/50 rounded-b-lg overflow-auto flex-1 min-h-[55vh] auto-rows-min">
            {days.map((day) => {
              const de = dayEvents(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const isInMonth = isSameMonth(day, currentMonth);
              const visible = de.slice(0, MAX_VISIBLE_PER_DAY);
              const moreCount = de.length - MAX_VISIBLE_PER_DAY;

              return (
                <div
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDate(day)}
                  onDoubleClick={() => openDayPopup(day)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedDate(day);
                    }
                  }}
                  className={cn(
                    "min-h-[100px] flex flex-col border-b border-r border-border/50 last:border-r-0 bg-card transition-colors cursor-pointer",
                    !isInMonth && "bg-muted/20",
                    isSelected && "ring-2 ring-primary ring-inset",
                    isToday && !isSelected && "bg-primary/5"
                  )}
                >
                  <div
                    className={cn(
                      "flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium self-end mt-0.5 mr-0.5",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : isInMonth
                          ? "text-foreground"
                          : "text-muted-foreground/60"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-0.5 p-1">
                    {visible.map((item) => {
                      const course = courses.find((c) => c.id === item.course_id);
                      const color = course?.color ?? "#6366f1";
                      return (
                        <button
                          key={item.source === "assignment" ? `a-${item.id}` : item.id}
                          type="button"
                          onClick={(e) => openDetail(e, item)}
                          className={cn(
                            "w-full text-left rounded border-l-2 py-1 px-1.5 text-xs font-medium truncate transition-opacity hover:opacity-90",
                            TYPE_COLORS[item.type]
                          )}
                          style={{ borderLeftColor: color }}
                          title={item.title}
                        >
                          <span className="truncate block">{item.title}</span>
                        </button>
                      );
                    })}
                    {moreCount > 0 && (
                      <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">
                        +{moreCount} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day popup: all assignments/events on this day */}
      <Modal open={!!dayPopupDate} onOpenChange={(open) => !open && setDayPopupDate(null)}>
        {dayPopupDate && (
          <>
            <ModalHeader>
              <ModalTitle>
                {format(dayPopupDate, "EEEE, MMMM d, yyyy")}
              </ModalTitle>
            </ModalHeader>
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {dayPopupItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignments or events this day.</p>
              ) : (
                dayPopupItems.map((item) => {
                  const course = courses.find((c) => c.id === item.course_id);
                  const color = course?.color ?? "#6366f1";
                  return (
                    <button
                      key={item.source === "assignment" ? `a-${item.id}` : item.id}
                      type="button"
                      onClick={(e) => openAssignmentFromDay(e, item)}
                      className={cn(
                        "w-full text-left rounded border-l-2 py-2 px-3 text-sm font-medium transition-opacity hover:opacity-90 flex items-center gap-2",
                        TYPE_COLORS[item.type]
                      )}
                      style={{ borderLeftColor: color }}
                    >
                      <span>{TYPE_EMOJI[item.type]}</span>
                      <span className="truncate">{item.title}</span>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {course?.name ?? "—"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="pt-3">
              <Button variant="outline" size="sm" onClick={() => setDayPopupDate(null)}>
                Close
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Event/Assignment detail popup */}
      <Modal open={detailOpen} onOpenChange={setDetailOpen}>
        {detailItem && (
          <>
            <ModalHeader>
              <ModalTitle className="flex items-center gap-2">
                <span>{TYPE_EMOJI[detailItem.type]}</span>
                {detailItem.title}
              </ModalTitle>
            </ModalHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4 shrink-0" />
                <span>
                  {courses.find((c) => c.id === detailItem.course_id)?.name ?? "Unknown course"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  {format(parseAssignmentDate(detailItem.event_date), "EEEE, MMMM d, yyyy")}
                </span>
              </div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground capitalize">
                {detailItem.type}
              </p>
              {detailItem.description && (
                <p className="text-sm text-muted-foreground border-t border-border pt-3">
                  {detailItem.description}
                </p>
              )}
              {detailItem.source === "assignment" && "worth" in detailItem && detailItem.worth != null && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Worth </span>
                  <span className="font-medium">{detailItem.worth}%</span>
                </p>
              )}
              {detailItem.source === "assignment" && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <label className="text-sm font-medium shrink-0">Grade</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="—"
                    value={detailItem.grade ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || !Number.isNaN(Number(v))) {
                        setDetailItem((prev) =>
                          prev && prev.source === "assignment"
                            ? { ...prev, grade: v === "" ? null : Number(v) }
                            : prev
                        );
                      }
                    }}
                    onBlur={(e) =>
                      handleUpdateAssignmentGrade(detailItem.id, e.target.value)
                    }
                    disabled={updatingGradeId === detailItem.id}
                    className="w-20 h-9 text-sm text-right"
                  />
                </div>
              )}
              <div className="flex justify-end pt-4 gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1"
                  onClick={() => setConfirmDeleteItem(detailItem)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDeleteItem !== null}
        onOpenChange={(open) => !open && setConfirmDeleteItem(null)}
        title="Delete item"
        message="Are you sure you want to delete this item? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDeleteItem) {
            deleteCalendarItem(confirmDeleteItem);
            setDetailOpen(false);
          }
        }}
      />

      {/* Add event modal */}
      <Modal open={addOpen} onOpenChange={setAddOpen}>
        <ModalHeader>
          <ModalTitle>
            Add event{selectedDate ? ` on ${format(selectedDate, "MMM d, yyyy")}` : ""}
          </ModalTitle>
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

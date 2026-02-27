import { useState } from "react";
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
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { Input } from "@/components/Input";
import { Modal, ModalHeader, ModalTitle } from "@/components/Modal";
import { Select } from "@/components/Select";
import { cn } from "@/lib/utils";

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
  const { courses, events, addEvent, deleteEvent } = useStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    type: "assignment",
    courseId: "",
    description: "",
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const dayEvents = (date: Date) =>
    events.filter((e) => isSameDay(new Date(e.event_date), date));
  const selectedEvents = selectedDate ? dayEvents(selectedDate) : [];

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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>

      <Card>
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
            <p className="text-muted-foreground text-sm">No events on this date.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((event) => {
                const course = courses.find((c) => c.id === event.course_id);
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-center gap-4 rounded-lg border p-4",
                      TYPE_COLORS[event.type]
                    )}
                  >
                    <span>{TYPE_EMOJI[event.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm opacity-70">
                        {course?.name}
                        {event.description ? ` — ${event.description}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteEvent(event.id)}
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

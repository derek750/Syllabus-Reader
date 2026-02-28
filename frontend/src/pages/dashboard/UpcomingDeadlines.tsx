import type { Event } from "@/types";
import type { Course } from "@/types";
import { parseAssignmentDate } from "@/lib/utils";

interface UpcomingDeadlinesProps {
  events: Event[];
  courses: Course[];
  format: (date: Date, fmt: string) => string;
}

export function UpcomingDeadlines({ events, courses, format }: UpcomingDeadlinesProps) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Upcoming Deadlines</h2>
      <div className="space-y-2">
        {events.slice(0, 8).map((event) => {
          const course = courses.find((c) => c.id === event.course_id);
          return (
            <div
              key={event.id}
              className="flex items-center gap-4 bg-card rounded-lg border p-4"
            >
              <div
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: course?.color ?? "#6366f1" }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{event.title}</p>
                <p className="text-sm text-muted-foreground">{course?.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium">
                  {format(parseAssignmentDate(event.event_date), "MMM d")}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{event.type}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

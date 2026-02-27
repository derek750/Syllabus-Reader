import { format, isPast, isToday } from "date-fns";
import { Trash2 } from "lucide-react";
import type { Course, Event, GradeCategory, Grade } from "@/types";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

interface CourseCardProps {
  course: Course;
  events: Event[];
  categories: GradeCategory[];
  grades: Grade[];
  getCourseAvg: (
    courseId: string,
    categories: GradeCategory[],
    grades: Grade[]
  ) => number | null;
  typeIcon: Record<string, string>;
  onDelete: () => void;
}

export function CourseCard({
  course,
  events,
  categories,
  grades,
  getCourseAvg,
  typeIcon,
  onDelete,
}: CourseCardProps) {
  const avg = getCourseAvg(course.id, categories, grades);
  const courseEvents = events.filter((e) => e.course_id === course.id);
  const nextEvent = courseEvents.find(
    (e) => !isPast(new Date(e.event_date)) || isToday(new Date(e.event_date))
  );

  return (
    <Card className="relative overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: course.color }} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{course.name}</CardTitle>
            {course.semester && (
              <p className="text-sm text-muted-foreground">{course.semester}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{courseEvents.length} events</span>
          {avg !== null && <span className="font-medium">{avg.toFixed(1)}%</span>}
        </div>
        {nextEvent && (
          <div className="text-sm bg-muted rounded-lg px-3 py-2">
            <span className="mr-1">{typeIcon[nextEvent.type] ?? "📌"}</span>
            <span className="font-medium">{nextEvent.title}</span>
            <span className="text-muted-foreground ml-2">
              {format(new Date(nextEvent.event_date), "MMM d")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

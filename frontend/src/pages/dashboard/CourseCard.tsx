import { Trash2 } from "lucide-react";
import type { Course, Assignment } from "@/types";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

interface CourseCardProps {
  course: Course;
  assignments: Assignment[];
  onDelete: () => void;
  onClick?: () => void;
}

export function CourseCard({
  course,
  assignments,
  onDelete,
  onClick,
}: CourseCardProps) {
  const avg = course.average_grade ?? null;

  return (
    <Card
      className="relative overflow-hidden cursor-pointer transition hover:shadow-md flex flex-col h-[140px]"
      onClick={onClick}
    >
      <div className="h-1.5 flex-shrink-0" style={{ backgroundColor: course.color }} />
      <CardHeader className="pb-1 pt-3 px-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-heading truncate min-w-0 flex-1">
            {course.name}
          </CardTitle>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-4 flex-1 flex flex-col min-h-0">
        <div className="h-5 flex items-center text-xs text-muted-foreground flex-shrink-0">
          {course.code && (
            <span className="uppercase tracking-wide font-medium">{course.code}</span>
          )}
          {course.code && course.semester && (
            <span className="mx-1.5">·</span>
          )}
          {course.semester && <span>{course.semester}</span>}
        </div>
        <div className="flex items-center justify-between text-xs mt-auto pt-4 flex-shrink-0">
          <span className="text-muted-foreground">{assignments.length} assignments</span>
          <span className="font-medium tabular-nums">
            {avg !== null ? `${avg.toFixed(1)}%` : "—"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

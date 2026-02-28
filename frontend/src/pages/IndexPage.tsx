import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { isToday, isFuture, addDays } from "date-fns";
import { parseAssignmentDate } from "@/lib/utils";
import { Plus, BookOpen, CalendarDays, GraduationCap, Trash2 } from "lucide-react";
import { useStore } from "@/store";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { CreateCourseModal } from "@/components/CreateCourseModal";
import { Skeleton } from "@/components/Skeleton";
import { DashboardStats } from "@/pages/dashboard/DashboardStats";
import { CourseCard } from "@/pages/dashboard/CourseCard";
import type { Course, Assignment } from "@/types";

const COURSE_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4",
];

function colorForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COURSE_COLORS[h % COURSE_COLORS.length];
}

const API_BASE = "http://localhost:8000/api";

export function IndexPage() {
  const navigate = useNavigate();
  const { courses, addCourse, deleteCourse, setCourses } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newSemester, setNewSemester] = useState("");
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const loadCourses = useCallback(async () => {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) {
      setCoursesLoading(false);
      return;
    }
    setCoursesLoading(true);
    setLoadError("");
    try {
      const parsed = JSON.parse(userRaw);
      const userId = parsed?.id;
      if (!userId) {
        setCoursesLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/courses?user_id=${userId}`);
      if (!res.ok) throw new Error("Failed to load courses");
      const data = await res.json();
      const rows: unknown[] = Array.isArray(data?.courses) ? (data.courses as unknown[]) : [];
      const normalized: Course[] = rows.map((row) => {
        const c = (row ?? {}) as Record<string, unknown>;
        const id = String(c.id ?? "");
        const createdAt = String(c.created_at ?? new Date().toISOString());
        const updatedAt = String(c.updated_at ?? createdAt);
        const avg = c.average_grade;
        return {
          id,
          name: String(c.course_name ?? c.name ?? ""),
          code: c.course_code == null ? null : String(c.course_code),
          semester: c.semester == null ? null : String(c.semester),
          color: String(c.color ?? colorForId(id)),
          syllabus_path: c.syllabus_path == null ? null : String(c.syllabus_path),
          created_at: createdAt,
          updated_at: updatedAt,
          average_grade: typeof avg === "number" && !Number.isNaN(avg) ? avg : null,
        };
      });
      setCourses(normalized);
    } catch (err) {
      console.error("Failed to load courses", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load courses");
    } finally {
      setCoursesLoading(false);
    }
  }, [setCourses]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const loadAssignments = useCallback(async () => {
    if (courses.length === 0) {
      setAssignments([]);
      return;
    }
    try {
      const results = await Promise.all(
        courses.map((c) =>
          fetch(`${API_BASE}/courses/${c.id}/assignments?include_archived=false`).then((r) =>
            r.ok ? r.json() : { assignments: [] }
          )
        )
      );
      const all = results.flatMap((d) => (d.assignments || []) as Assignment[]);
      setAssignments(all);
    } catch {
      setAssignments([]);
    }
  }, [courses]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const now = new Date();
  const end14 = addDays(now, 14);
  const dueIn14Count = assignments.filter((a) => {
    if (!a.due_date) return false;
    const d = parseAssignmentDate(a.due_date);
    return (isToday(d) || isFuture(d)) && d <= end14;
  }).length;
  const assignmentCount = assignments.length;

  const handleAddCourse = () => {
    if (!newCourseName.trim()) return;
    addCourse(newCourseName.trim(), newSemester.trim() || null);
    setNewCourseName("");
    setNewSemester("");
    setAddOpen(false);
  };

  const overallAvg = (() => {
    const withGrade = courses.filter((c) => c.average_grade != null && !Number.isNaN(c.average_grade));
    if (!withGrade.length) return null;
    return withGrade.reduce((s, c) => s + (c.average_grade ?? 0), 0) / withGrade.length;
  })();

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-heading">Dashboard</h1>
        </div>
        <Button className="gap-2" size="lg" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Course
        </Button>
      </header>

      {loadError && (
        <div className="rounded-xl bg-destructive/10 text-destructive border border-destructive/20 px-4 py-3 text-sm">
          {loadError}
        </div>
      )}

      <DashboardStats
        courseCount={courses.length}
        assignmentCount={assignmentCount}
        upcomingCount={dueIn14Count}
        overallAvg={overallAvg}
        iconBook={BookOpen}
        iconCalendar={CalendarDays}
        iconGraduation={GraduationCap}
      />

      <section>
        <h2 className="text-xl font-semibold mb-4 font-heading">Your Courses</h2>
        {coursesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-2 w-full" />
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mb-3 opacity-60" />
              <p className="font-medium">No courses yet</p>
              <p className="text-sm mt-1">Add one to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                assignments={assignments.filter((a) => a.course_id === course.id)}
                onDelete={async () => {
                  if (!confirm("Are you sure you want to delete this course?")) return;
                  deleteCourse(course.id);
                  try {
                    const res = await fetch(`${API_BASE}/courses/${course.id}`, {
                      method: "DELETE",
                    });
                    if (!res.ok) throw new Error("Failed to delete course");
                    await loadCourses();
                  } catch (err) {
                    alert(err instanceof Error ? err.message : "Failed to delete course");
                  }
                }}
                onClick={() => navigate(`/courses/${course.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      <CreateCourseModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={async (data) => {
          let userId: string | null = null;
          try {
            const raw = localStorage.getItem("user");
            userId = raw ? JSON.parse(raw).id : null;
          } catch {
            userId = null;
          }
          try {
            if (!userId) throw new Error("No user logged in");
            const res = await fetch(`${API_BASE}/courses?user_id=${userId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create course");
            await loadCourses();
            setAddOpen(false);
          } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to create course");
          }
        }}
        isLoading={false}
      />
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, BookOpen, ChevronRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { Skeleton } from "@/components/Skeleton";
import { CreateCourseModal } from "@/components/CreateCourseModal";

const COURSE_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4",
];

function colorForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COURSE_COLORS[h % COURSE_COLORS.length];
}

interface Course {
  id: string;
  course_name: string;
  course_code?: string;
  instructor?: string;
  semester?: string;
  description?: string | null;
  color?: string;
  average_grade?: number | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const API_BASE = "http://localhost:8000/api";

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const userId = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!).id
    : null;

  const loadCourses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/courses?user_id=${userId}`);
      if (!response.ok) throw new Error("Failed to load courses");

      const data = await response.json();
      const raw = Array.isArray(data.courses) ? (data.courses as Course[]) : [];
      setCourses(raw);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadCourses();
    }
  }, [userId, loadCourses]);

  const handleCreateCourse = async (courseData: {
    course_name: string;
    course_code?: string;
    semester?: string;
    instructor?: string;
  }) => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/courses?user_id=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData),
      });

      if (!response.ok) throw new Error("Failed to create course");

      const data = await response.json();
      const newCourse = data.course as Course;
      setCourses([...courses, { ...newCourse, color: newCourse.color ?? colorForId(newCourse.id) }]);
      setCreateModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 font-heading">
            <BookOpen className="w-8 h-8 text-primary" />
            Courses
          </h1>
        </div>
        <Button
          size="lg"
          onClick={() => setCreateModalOpen(true)}
          className="gap-2"
        >
          <Plus className="w-5 h-5" />
          New Course
        </Button>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 text-destructive border border-destructive/20 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading && courses.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-2 w-full" />
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 pt-4 border-t border-border/80">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="w-14 h-14 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-semibold font-heading mb-2">No courses yet</p>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Create your first course to get started.
            </p>
            <Button onClick={() => setCreateModalOpen(true)} className="gap-2" size="lg">
              <Plus className="w-4 h-4" />
              Create Course
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const color = course.color ?? colorForId(course.id);
            const description = (course.description ?? [course.instructor, course.semester].filter(Boolean).join(" · ")) || null;
            return (
              <Link key={course.id} to={`/courses/${course.id}`} className="block group">
                <Card className="h-[200px] flex flex-col transition-all duration-200 hover:shadow-lg hover:border-primary/30 overflow-hidden">
                  <div
                    className="h-1.5 shrink-0 transition-opacity group-hover:opacity-90"
                    style={{ backgroundColor: color }}
                  />
                  <CardContent className="p-5 flex-1 flex flex-col min-h-0">
                    {/* Fixed slot: title + chevron */}
                    <div className="flex items-start justify-between gap-3 shrink-0 h-7">
                      <h3 className="font-semibold text-lg truncate transition-colors group-hover:opacity-90 min-w-0 flex-1" style={{ color }}>
                        {course.course_name}
                      </h3>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 transition-colors group-hover:opacity-80" style={{ color }} />
                    </div>
                    {/* Fixed slot: course code (always same height) */}
                    <div className="h-5 mt-0.5 shrink-0 flex items-center">
                      <p className="text-sm text-muted-foreground font-mono truncate">
                        {course.course_code || "\u00A0"}
                      </p>
                    </div>
                    {/* Fixed slot: description (always 2-line height) */}
                    <div className="h-10 mt-1 shrink-0 overflow-hidden">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {description || "\u00A0"}
                      </p>
                    </div>
                    {/* Spacer pushes grade to bottom */}
                    <div className="flex-1 min-h-2" />
                    {/* Fixed slot: grade always at bottom */}
                    <div className="flex items-center gap-2 pt-4 border-t border-border/80 shrink-0 h-9">
                      <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" style={{ color }} />
                      <span className="text-sm font-medium truncate" style={{ color }}>
                        {course.average_grade != null ? `${course.average_grade}%` : "—"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <CreateCourseModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateCourse}
        isLoading={loading}
      />
    </div>
  );
}

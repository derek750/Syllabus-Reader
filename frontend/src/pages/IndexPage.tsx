import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, isFuture, addDays } from "date-fns";
import { Plus, BookOpen, CalendarDays, GraduationCap, Trash2, ArrowRight } from "lucide-react";
import { useStore } from "@/store";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Input } from "@/components/Input";
import { Modal, ModalHeader, ModalTitle } from "@/components/Modal";
import { CreateCourseModal } from "@/components/CreateCourseModal";
import { SyllabusUploadModal } from "@/components/SyllabusUploadModal";
import { DashboardStats } from "@/pages/dashboard/DashboardStats";
import { CourseCard } from "@/pages/dashboard/CourseCard";
import { UpcomingDeadlines } from "@/pages/dashboard/UpcomingDeadlines";

const EVENT_TYPE_ICON: Record<string, string> = {
  exam: "🔴",
  assignment: "🟠",
  reading: "🟢",
  event: "🟣",
};

const COURSE_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4",
];

function colorForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COURSE_COLORS[h % COURSE_COLORS.length];
}

function getCourseAvg(
  courseId: string,
  categories: ReturnType<typeof useStore>["categories"],
  grades: ReturnType<typeof useStore>["grades"]
): number | null {
  const cats = categories.filter((c) => c.course_id === courseId);
  if (!cats.length) return null;
  let totalWeighted = 0;
  let totalWeight = 0;
  for (const cat of cats) {
    const catGrades = grades.filter((g) => g.category_id === cat.id && g.score !== null);
    if (!catGrades.length) continue;
    const avg =
      catGrades.reduce((s, g) => s + (g.score! / g.max_score) * 100, 0) / catGrades.length;
    totalWeighted += avg * cat.weight;
    totalWeight += cat.weight;
  }
  return totalWeight > 0 ? totalWeighted / totalWeight : null;
}

export function IndexPage() {
  const navigate = useNavigate();
  const { courses, events, categories, grades, addCourse, deleteCourse, setCourses } = useStore();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourseName, setSelectedCourseName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newSemester, setNewSemester] = useState("");

  const loadCourses = useCallback(async () => {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) return;
    try {
      const parsed = JSON.parse(userRaw);
      const userId = parsed?.id;
      if (!userId) return;
      const API_BASE = "http://localhost:8000/api";
      const res = await fetch(`${API_BASE}/courses?user_id=${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data?.courses) ? data.courses : [];
      const normalized = rows.map((c: any) => {
        const id = String(c.id ?? "");
        const createdAt = String(c.created_at ?? new Date().toISOString());
        const updatedAt = String(c.updated_at ?? createdAt);
        return {
          id,
          name: String(c.course_name ?? c.name ?? ""),
          semester: c.semester ?? null,
          color: String(c.color ?? colorForId(id)),
          syllabus_path: c.syllabus_path ?? null,
          created_at: createdAt,
          updated_at: updatedAt,
        };
      });
      setCourses(normalized);
    } catch (err) {
      console.error("Failed to load courses", err);
    }
  }, [setCourses]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const upcomingEvents = events.filter((e) => {
    const d = new Date(e.event_date);
    return isToday(d) || (isFuture(d) && d <= addDays(new Date(), 14));
  });

  const handleAddCourse = () => {
    if (!newCourseName.trim()) return;
    addCourse(newCourseName.trim(), newSemester.trim() || null);
    setNewCourseName("");
    setNewSemester("");
    setAddOpen(false);
  };

  const overallAvg = (() => {
    const avgs = courses
      .map((c) => getCourseAvg(c.id, categories, grades))
      .filter((a): a is number => a !== null);
    return avgs.length ? avgs.reduce((s, a) => s + a, 0) / avgs.length : null;
  })();

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your courses and upcoming deadlines</p>
        </div>
        <Button className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Course
        </Button>
      </header>

      <DashboardStats
        courseCount={courses.length}
        upcomingCount={upcomingEvents.length}
        overallAvg={overallAvg}
        iconBook={BookOpen}
        iconCalendar={CalendarDays}
        iconGraduation={GraduationCap}
      />

      {/* Courses & Syllabi Feature Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Save Your Syllabi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Organize your courses and upload syllabus PDFs to keep everything in one place. Access your syllabi anytime from any device.
          </p>
          <Button
            onClick={() => navigate("/courses")}
            className="w-full gap-2"
            variant="default"
          >
            Go to Courses
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
        {courses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mb-3" />
              <p>No courses yet. Add one to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                events={events}
                categories={categories}
                grades={grades}
                getCourseAvg={getCourseAvg}
                typeIcon={EVENT_TYPE_ICON}
                onDelete={async () => {
                  if (!confirm("Are you sure you want to delete this course?")) return;
                  // remove from local store immediately to keep events/categories/grades in sync
                  deleteCourse(course.id);
                  const API_BASE = "http://localhost:8000/api";
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
                onUpload={() => {
                  setSelectedCourseId(course.id);
                  setSelectedCourseName((course as any).name ?? "");
                  setUploadModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {upcomingEvents.length > 0 && (
        <UpcomingDeadlines events={upcomingEvents} courses={courses} format={format} />
      )}

      <CreateCourseModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={async (data) => {
          // Persist to backend and refresh our local list
          const API_BASE = "http://localhost:8000/api";
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
      {selectedCourseId && (
        <SyllabusUploadModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          onSubmit={async (file) => {
            const API_BASE = "http://localhost:8000/api";
            const form = new FormData();
            form.append("file", file);
            try {
              const res = await fetch(`${API_BASE}/courses/${selectedCourseId}/syllabus`, {
                method: "POST",
                body: form,
              });
              if (!res.ok) throw new Error("Upload failed");
              await loadCourses();
              setUploadModalOpen(false);
            } catch (err) {
              alert(err instanceof Error ? err.message : "Upload failed");
            }
          }}
          isLoading={false}
          courseId={selectedCourseId}
          courseName={selectedCourseName}
        />
      )}
    </div>
  );
}

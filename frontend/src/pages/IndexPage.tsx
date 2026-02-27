import { useState } from "react";
import { format, isToday, isFuture, addDays } from "date-fns";
import { Plus, BookOpen, CalendarDays, GraduationCap, Trash2 } from "lucide-react";
import { useStore } from "@/store";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Input } from "@/components/Input";
import { Modal, ModalHeader, ModalTitle } from "@/components/Modal";
import { DashboardStats } from "@/pages/dashboard/DashboardStats";
import { CourseCard } from "@/pages/dashboard/CourseCard";
import { UpcomingDeadlines } from "@/pages/dashboard/UpcomingDeadlines";

const EVENT_TYPE_ICON: Record<string, string> = {
  exam: "🔴",
  assignment: "🟠",
  reading: "🟢",
  event: "🟣",
};

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
  const { courses, events, categories, grades, addCourse, deleteCourse } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newSemester, setNewSemester] = useState("");

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
                onDelete={() => deleteCourse(course.id)}
              />
            ))}
          </div>
        )}
      </section>

      {upcomingEvents.length > 0 && (
        <UpcomingDeadlines events={upcomingEvents} courses={courses} format={format} />
      )}

      <Modal open={addOpen} onOpenChange={setAddOpen}>
        <ModalHeader>
          <ModalTitle>Add a new course</ModalTitle>
        </ModalHeader>
        <div className="space-y-4">
          <Input
            placeholder="Course name"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
          />
          <Input
            placeholder="Semester (optional)"
            value={newSemester}
            onChange={(e) => setNewSemester(e.target.value)}
          />
          <Button
            className="w-full"
            disabled={!newCourseName.trim()}
            onClick={handleAddCourse}
          >
            Add Course
          </Button>
        </div>
      </Modal>
    </div>
  );
}

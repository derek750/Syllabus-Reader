import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, BookOpen, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { Skeleton } from "@/components/Skeleton";
import { CreateCourseModal } from "@/components/CreateCourseModal";

interface Course {
  id: string;
  course_name: string;
  course_code?: string;
  instructor?: string;
  semester?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface Syllabus {
  id: string;
  file_name: string;
  page_count: number;
  file_size_bytes: number;
  download_url: string;
  created_at: string;
  course_id: string;
}

interface CourseWithSyllabi extends Course {
  syllabi: Syllabus[];
}

const API_BASE = "http://localhost:8000/api";

export function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithSyllabi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const userId = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!).id
    : null;

  useEffect(() => {
    if (userId) {
      loadCourses();
    }
  }, [userId]);

  const loadCourses = async () => {
    if (!userId) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/courses?user_id=${userId}`);
      if (!response.ok) throw new Error("Failed to load courses");

      const data = await response.json();
      const rows = (data.courses || []).map((c: any) => ({ ...c, syllabi: c.syllabi || [] }));
      setCourses(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

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
      setCourses([
        ...courses,
        { ...data.course, syllabi: [] } as CourseWithSyllabi,
      ]);
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
          <p className="text-muted-foreground mt-1">
            Manage your courses and syllabi
          </p>
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
              Create your first course to upload syllabi and track assignments.
            </p>
            <Button onClick={() => setCreateModalOpen(true)} className="gap-2" size="lg">
              <Plus className="w-4 h-4" />
              Create Course
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`} className="block group">
              <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary/30 overflow-hidden">
                <div className="h-1.5 bg-primary/80 group-hover:bg-primary" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                        {course.course_name}
                      </h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-sm text-muted-foreground">
                        {course.course_code && <span>{course.course_code}</span>}
                        {course.instructor && <span>{course.instructor}</span>}
                        {course.semester && <span>{course.semester}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/80">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {course.syllabi.length} syllabus{course.syllabi.length !== 1 ? "i" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
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

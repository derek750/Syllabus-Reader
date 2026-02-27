import { useState, useEffect } from "react";
import { Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/Button";
import { CreateCourseModal } from "@/components/CreateCourseModal";
import { SyllabusUploadModal } from "@/components/SyllabusUploadModal";
import { CourseWithSyllabi } from "@/components/CourseWithSyllabi";

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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourseName, setSelectedCourseName] = useState("");

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
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSyllabus = async (courseId: string, file: File) => {
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_BASE}/courses/${courseId}/syllabus`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Failed to upload syllabus");

      const data = await response.json();

      setCourses(
        courses.map((course) =>
          course.id === courseId
            ? {
                ...course,
                syllabi: [...course.syllabi, data.syllabus],
              }
            : course
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/courses/${courseId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete course");

      setCourses(courses.filter((c) => c.id !== courseId));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSyllabus = async (syllabusId: string) => {
    if (!confirm("Are you sure you want to delete this syllabus?")) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/syllabi/${syllabusId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete syllabus");

      setCourses(
        courses.map((course) => ({
          ...course,
          syllabi: course.syllabi.filter((s) => s.id !== syllabusId),
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSyllabus = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8" />
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

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Courses List */}
      {courses.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-lg font-medium mb-2">No courses yet</p>
          <p className="text-muted-foreground mb-4">
            Create your first course to get started
          </p>
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Course
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {courses.map((course) => (
            <CourseWithSyllabi
              key={course.id}
              courseId={course.id}
              courseName={course.course_name}
              courseCode={course.course_code}
              instructor={course.instructor}
              semester={course.semester}
              syllabi={course.syllabi}
              onUploadClick={() => {
                setSelectedCourseId(course.id);
                setSelectedCourseName(course.course_name);
                setUploadModalOpen(true);
              }}
              onDeleteClick={() => handleDeleteCourse(course.id)}
              onDownloadClick={handleDownloadSyllabus}
              onDeleteSyllabusClick={handleDeleteSyllabus}
              isLoading={loading}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateCourseModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateCourse}
        isLoading={loading}
      />

      {selectedCourseId && (
        <SyllabusUploadModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          onSubmit={(file) => handleUploadSyllabus(selectedCourseId, file)}
          isLoading={loading}
          courseId={selectedCourseId}
          courseName={selectedCourseName}
        />
      )}
    </div>
  );
}

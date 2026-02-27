import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/Button";
import { CourseWithSyllabi } from "@/components/CourseWithSyllabi";

const API_BASE = "http://localhost:8000/api";

interface Course {
  id: string;
  course_name: string;
  course_code?: string;
  instructor?: string;
  semester?: string;
}

interface Syllabus {
  id: string;
  file_name: string;
  page_count: number;
  file_size_bytes: number;
  download_url: string;
  created_at: string;
}

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/courses/${courseId}`);
        if (!res.ok) throw new Error("Failed to load course");
        const data = await res.json();
        setCourse(data.course);
        setSyllabi(data.syllabi || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  const handleDeleteCourse = async () => {
    if (!courseId) return;
    if (!confirm("Are you sure you want to delete this course?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete course");
      navigate("/courses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete course");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSyllabus = async (file: File) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_BASE}/courses/${courseId}/syllabus`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload syllabus");
      const data = await response.json();
      setSyllabi((prev) => [...prev, data.syllabus]);
      setUploadModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload syllabus");
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
      setSyllabi((prev) => prev.filter((s) => s.id !== syllabusId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete syllabus");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSyllabus = (url: string) => {
    window.open(url, "_blank");
  };

  if (!courseId) {
    return <div>Missing course ID</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="w-7 h-7" />
              {course?.course_name ?? "Course"}
            </h1>
            {course && (
              <p className="text-muted-foreground mt-1">
                {[course.course_code, course.instructor, course.semester]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-600 p-4 rounded-lg text-sm">
          {error}
        </div>
      )}

      {course && (
        <CourseWithSyllabi
          courseId={course.id}
          courseName={course.course_name}
          courseCode={course.course_code}
          instructor={course.instructor}
          semester={course.semester}
          syllabi={syllabi}
          onUploadClick={() => setUploadModalOpen(true)}
          onDeleteClick={handleDeleteCourse}
          onDownloadClick={handleDownloadSyllabus}
          onDeleteSyllabusClick={handleDeleteSyllabus}
          isLoading={loading}
        />
      )}

      {/* Simple inline upload control for now */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-background rounded-xl p-6 shadow-lg w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Upload syllabus</h2>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleUploadSyllabus(file);
                }
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setUploadModalOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


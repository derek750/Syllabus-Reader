import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, FileText, Calendar, Percent, MapPin, Info } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { CourseWithSyllabi } from "@/components/CourseWithSyllabi";
import { SyllabusUploadModal } from "@/components/SyllabusUploadModal";

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

export interface Assignment {
  id: string;
  course_id: string;
  name: string;
  due_date: string;
  worth: number;
  extra_info?: string | null;
  location?: string | null;
  created_at: string;
}

const CHART_COLORS = [
  "hsl(262, 83%, 58%)",
  "hsl(262, 70%, 65%)",
  "hsl(262, 60%, 72%)",
  "hsl(220, 70%, 55%)",
  "hsl(180, 60%, 50%)",
  "hsl(40, 80%, 55%)",
  "hsl(0, 65%, 55%)",
  "hsl(320, 60%, 55%)",
];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const loadAssignments = useCallback(async () => {
    if (!courseId) return;
    setAssignmentsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/assignments`);
      if (!res.ok) throw new Error("Failed to load assignments");
      const data = await res.json();
      const list = data.assignments || [];
      setAssignments(list);
      setSelectedAssignment((prev) =>
        prev && list.some((a: Assignment) => a.id === prev.id) ? prev : null
      );
    } catch {
      setAssignments([]);
      setSelectedAssignment(null);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [courseId]);

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

  useEffect(() => {
    if (courseId) loadAssignments();
  }, [courseId, loadAssignments]);

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

  const pieData =
    assignments.length > 0
      ? assignments.map((a, i) => ({
          name: a.name.length > 20 ? a.name.slice(0, 20) + "…" : a.name,
          value: Math.max(0, a.worth) || 0,
          fullName: a.name,
          color: CHART_COLORS[i % CHART_COLORS.length],
        })).filter((d) => d.value > 0)
      : [];

  if (!courseId) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Missing course ID
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/courses")}
            className="shrink-0 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </span>
              {course?.course_name ?? "Course"}
            </h1>
            {course && (
              <p className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0">
                {course.course_code && <span>{course.course_code}</span>}
                {course.instructor && <span>{course.instructor}</span>}
                {course.semester && <span>{course.semester}</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 text-destructive border border-destructive/20 p-4 text-sm">
          {error}
        </div>
      )}

      {course && (
        <>
          {/* Syllabi section */}
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
            onAssignmentsRefreshed={loadAssignments}
          />
        </>
      )}

      {/* Assignments section with pie chart + list + detail sidebar */}
      {course && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-1 min-w-0 p-6 space-y-6">
                {assignmentsLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    Loading assignments…
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-3 opacity-50" />
                    <p>No assignments yet. Add them from the syllabi section or manually.</p>
                  </div>
                ) : (
                  <>
                    {pieData.length > 0 && (
                      <div className="h-64 w-full max-w-sm mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => [`${value}%`, "Worth"]}
                              contentStyle={{ borderRadius: "var(--radius)" }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                        <p className="text-center text-sm text-muted-foreground mt-2">
                          Grade weight distribution
                        </p>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium mb-3">All assignments</h4>
                      <ul className="space-y-2">
                        {assignments.map((a) => (
                          <li key={a.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedAssignment(a)}
                              className={`
                                w-full text-left rounded-xl border p-4 transition-all
                                ${selectedAssignment?.id === a.id
                                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                  : "border-border hover:bg-muted/50"}
                              `}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium truncate">{a.name}</span>
                                <span className="text-sm text-muted-foreground shrink-0">
                                  {a.worth}%
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Due {formatDate(a.due_date)}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>

              {/* Detail sidebar */}
              <div className="lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l bg-muted/20 shrink-0">
                {selectedAssignment ? (
                  <div className="p-6 space-y-5 sticky top-4">
                    <h4 className="font-semibold text-lg">Details</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          Name
                        </p>
                        <p className="font-medium">{selectedAssignment.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Due date
                          </p>
                          <p>{formatDate(selectedAssignment.due_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Worth
                          </p>
                          <p>{selectedAssignment.worth}% of grade</p>
                        </div>
                      </div>
                      {selectedAssignment.location && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Location
                            </p>
                            <p className="text-sm">{selectedAssignment.location}</p>
                          </div>
                        </div>
                      )}
                      {selectedAssignment.extra_info && (
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Extra info
                            </p>
                            <p className="text-sm whitespace-pre-wrap">
                              {selectedAssignment.extra_info}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 flex flex-col items-center justify-center min-h-[200px] text-muted-foreground text-sm text-center">
                    <Info className="h-10 w-10 mb-2 opacity-50" />
                    <p>Select an assignment to view full details</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {courseId && (
        <SyllabusUploadModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          onSubmit={handleUploadSyllabus}
          isLoading={loading}
          courseId={courseId}
          courseName={course?.course_name ?? "Course"}
        />
      )}
    </div>
  );
}

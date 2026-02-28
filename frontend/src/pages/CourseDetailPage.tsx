import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, BookOpen, FileText, Calendar, Percent, MapPin, Info, Upload, Download, Trash2, Sparkles } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { SyllabusUploadModal } from "@/components/SyllabusUploadModal";
import { Input } from "@/components/Input";
import { Modal, ModalHeader, ModalTitle } from "@/components/Modal";
import { formatAssignmentDate, formatAssignmentTime } from "@/lib/utils";

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
  due_time?: string | null;
  worth: number;
  extra_info?: string | null;
  location?: string | null;
  grade?: number | null;
  archived?: boolean | null;
  created_at: string;
}

interface ExtractedAssignment {
  name: string;
  due_date: string;
  due_time?: string | null;
  worth: number | null;
  extra_info?: string | null;
  location?: string | null;
}
type ExtractedAssignmentItem = ExtractedAssignment & { _key: string };

const CHART_COLORS = [
  "hsl(166, 76%, 38%)",
  "hsl(166, 60%, 48%)",
  "hsl(180, 55%, 45%)",
  "hsl(200, 70%, 50%)",
  "hsl(25, 95%, 53%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 60%, 55%)",
  "hsl(320, 60%, 55%)",
];

function formatDate(dateString: string) {
  return formatAssignmentDate(dateString, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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
  const [updatingGradeId, setUpdatingGradeId] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<"weights" | "grades">("weights");

  const [extractingSyllabusId, setExtractingSyllabusId] = useState<string | null>(null);
  const [extractedModalOpen, setExtractedModalOpen] = useState(false);
  const [extractedFromSyllabus, setExtractedFromSyllabus] = useState<Syllabus | null>(null);
  const [extractedAssignments, setExtractedAssignments] = useState<ExtractedAssignmentItem[]>([]);
  const [acceptingExtractedKeys, setAcceptingExtractedKeys] = useState<Set<string>>(new Set());
  const [acceptAllLoading, setAcceptAllLoading] = useState(false);
  const [extractError, setExtractError] = useState("");

  const loadAssignments = useCallback(async () => {
    if (!courseId) return;
    setAssignmentsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/assignments?include_archived=true`);
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

  useEffect(() => {
    const onPlanExecuted = () => courseId && loadAssignments();
    window.addEventListener("agent-plan-executed", onPlanExecuted);
    return () => window.removeEventListener("agent-plan-executed", onPlanExecuted);
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
      const syllabus: Syllabus = {
        ...(data.syllabus as Syllabus),
        download_url: data.syllabus?.download_url ?? data.download_url ?? "",
      };
      setSyllabi((prev) => [...prev, syllabus]);
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

  const handleUpdateGrade = async (assignmentId: string, gradeValue: string) => {
    const grade = gradeValue.trim() === "" ? null : Number(gradeValue);
    if (gradeValue.trim() !== "" && (Number.isNaN(grade) || grade == null)) return;
    setUpdatingGradeId(assignmentId);
    try {
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade }),
      });
      if (!response.ok) throw new Error("Failed to update grade");
      const data = await response.json();
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId ? { ...a, grade: data.assignment?.grade ?? grade } : a
        )
      );
      setSelectedAssignment((prev) =>
        prev && prev.id === assignmentId ? { ...prev, grade: data.assignment?.grade ?? grade } : prev
      );
    } finally {
      setUpdatingGradeId(null);
    }
  };

  const handleToggleArchive = async (assignmentId: string, archived: boolean) => {
    try {
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      if (!response.ok) throw new Error("Failed to update assignment");
      const data = await response.json();
      const newArchived = data.assignment?.archived ?? archived;
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? { ...a, archived: newArchived } : a))
      );
      setSelectedAssignment((prev) =>
        prev && prev.id === assignmentId ? { ...prev, archived: newArchived } : prev
      );
    } catch {
      // surface via generic error banner
      setError("Failed to update assignment");
    }
  };

  const sanitizeExtractedForCreate = (a: ExtractedAssignment) => {
    const worth =
      typeof a.worth === "number" && !Number.isNaN(a.worth) ? Math.max(0, a.worth) : 0;
    const dueDateRaw = (a.due_date ?? "").toString().trim();
    const due_date = dueDateRaw.length >= 10 ? dueDateRaw.slice(0, 10) : null;
    return {
      name: a.name?.trim() || "Assignment",
      due_date,
      due_time: a.due_time?.trim() || null,
      worth,
      extra_info: a.extra_info?.trim() || null,
      location: a.location?.trim() || null,
    };
  };

  const createAssignmentFromExtracted = async (a: ExtractedAssignment) => {
    if (!courseId) throw new Error("Missing course");
    const response = await fetch(`${API_BASE}/courses/${courseId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sanitizeExtractedForCreate(a)),
    });
    if (!response.ok) throw new Error("Failed to create assignment");
    const data = await response.json();
    return data.assignment as Assignment;
  };

  const handleReadSyllabus = async (syllabus: Syllabus) => {
    setExtractError("");
    setExtractingSyllabusId(syllabus.id);
    try {
      const response = await fetch(
        `${API_BASE}/syllabi/${encodeURIComponent(syllabus.id)}/extract-assignments`,
        { method: "POST" }
      );
      if (!response.ok) throw new Error("Failed to read syllabus");
      const data = await response.json();
      const extractedRaw: ExtractedAssignment[] = Array.isArray(data.assignments)
        ? data.assignments
        : [];
      const extracted: ExtractedAssignmentItem[] = extractedRaw.map((a, idx) => ({
        ...a,
        _key: `${syllabus.id}-${Date.now()}-${idx}`,
      }));
      setExtractedFromSyllabus(syllabus);
      setExtractedAssignments(extracted);
      setExtractedModalOpen(true);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Failed to read syllabus");
    } finally {
      setExtractingSyllabusId(null);
    }
  };

  const handleAcceptExtracted = async (key: string) => {
    const a = extractedAssignments.find((x) => x._key === key);
    if (!a) return;
    setAcceptingExtractedKeys((prev) => new Set(prev).add(key));
    try {
      await createAssignmentFromExtracted(a);
      setExtractedAssignments((prev) => prev.filter((x) => x._key !== key));
      await loadAssignments();
    } catch {
      // keep in list; surface via page error for now
      setError("Failed to add assignment");
    } finally {
      setAcceptingExtractedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleAcceptAllExtracted = async () => {
    if (extractedAssignments.length === 0) return;
    setAcceptAllLoading(true);
    try {
      await Promise.all(extractedAssignments.map((a) => createAssignmentFromExtracted(a)));
      setExtractedAssignments([]);
      await loadAssignments();
    } catch {
      setError("Failed to add all assignments");
    } finally {
      setAcceptAllLoading(false);
    }
  };

  const assignmentsWithColors = assignments.map((a, idx) => ({
    ...a,
    _color: CHART_COLORS[idx % CHART_COLORS.length],
  }));
  const archivedAssignments = assignmentsWithColors.filter((a) => a.archived);
  const visibleAssignments = assignmentsWithColors.filter((a) => !a.archived);
  const [archivedModalOpen, setArchivedModalOpen] = useState(false);
  const [hoveredSliceIndex, setHoveredSliceIndex] = useState<number | null>(null);

  const weightsPieData =
    assignmentsWithColors.length > 0
      ? assignmentsWithColors.map((a) => ({
          name: a.name.length > 20 ? a.name.slice(0, 20) + "…" : a.name,
          fullName: a.name,
          value: round2(Math.max(0, a.worth) || 0),
          worth: round2(Math.max(0, a.worth) || 0),
          grade: a.grade != null ? round2(a.grade) : null,
          color: a._color,
        }))
      : [];

  let overallGrade: number | null = null;

  const gradesPieData = (() => {
    if (assignmentsWithColors.length === 0) return [];
    let earned = 0;
    let lost = 0;
    let ungraded = 0;
    for (const a of assignmentsWithColors) {
      const w = Math.max(0, a.worth) || 0;
      if (a.grade == null) {
        ungraded += w;
      } else {
        const g = Math.min(Math.max(a.grade, 0), 100) / 100;
        earned += g * w;
        lost += (1 - g) * w;
      }
    }
    const total = earned + lost + ungraded;
    if (total === 0) return [];
    const gradedTotal = earned + lost;
    if (gradedTotal > 0) {
      overallGrade = round2((earned / gradedTotal) * 100);
    }
    return [
      { name: "Earned", value: round2(earned), color: "hsl(146, 75%, 40%)" },
      { name: "Lost", value: round2(lost), color: "hsl(0, 72%, 51%)" },
      { name: "Ungraded", value: round2(ungraded), color: "hsl(210, 20%, 65%)" },
    ].filter((s) => s.value > 0);
  })();

  const pieData = chartMode === "weights" ? weightsPieData : gradesPieData;
  const pieTotal = pieData.reduce((sum, d) => sum + (d.value || 0), 0);
  const hoveredSlice =
    hoveredSliceIndex != null && hoveredSliceIndex >= 0 && hoveredSliceIndex < pieData.length
      ? pieData[hoveredSliceIndex]
      : null;

  if (!courseId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          Missing course ID
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1 space-y-1.5">
          {loading && !course ? (
            <div className="h-10 w-56 rounded-lg bg-muted animate-pulse" />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3 font-heading min-w-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <span className="truncate">{course?.course_name ?? "Course"}</span>
                </h1>

                {course && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-xs font-medium text-primary shadow-sm">
                    <span className="uppercase tracking-wide text-[10px] opacity-80">
                      Syllabus
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 gap-1 text-[11px]"
                      onClick={() => setUploadModalOpen(true)}
                    >
                      <Upload className="h-3 w-3" />
                      Upload
                    </Button>
                    {syllabi.length > 0 && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 gap-1 text-[11px]"
                          onClick={() => syllabi[0] && handleReadSyllabus(syllabi[0])}
                          disabled={extractingSyllabusId !== null}
                        >
                          <Sparkles className="h-3 w-3" />
                          Read
                        </Button>
                        <button
                          type="button"
                          onClick={() =>
                            syllabi[0] && handleDownloadSyllabus(syllabi[0].download_url)
                          }
                          className="inline-flex items-center gap-1 truncate max-w-[150px] rounded-full bg-background/80 px-2 py-0.5 text-[11px] hover:bg-background text-left"
                          title={syllabi[0]?.file_name}
                        >
                          <Download className="h-3 w-3 shrink-0" />
                          <span className="truncate">{syllabi[0].file_name}</span>
                        </button>
                        {syllabi.length > 1 && (
                          <span className="text-[10px] opacity-80">
                            +{syllabi.length - 1}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {course && (
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {course.course_code && <span>{course.course_code}</span>}
                  {course.instructor && <span>{course.instructor}</span>}
                  {course.semester && <span>{course.semester}</span>}
                  {extractError && (
                    <span className="text-destructive text-xs">{extractError}</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
            onClick={handleDeleteCourse}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete course
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/courses")} title="Exit">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 text-destructive border border-destructive/20 p-4 text-sm">
          {error}
        </div>
      )}

      <div>
        {course && (
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span>Assignments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={chartMode === "weights" ? "default" : "outline"}
                    onClick={() => setChartMode("weights")}
                  >
                    Weights
                  </Button>
                  <Button
                    size="sm"
                    variant={chartMode === "grades" ? "default" : "outline"}
                    onClick={() => setChartMode("grades")}
                  >
                    Your grades
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row">
                <div className="flex-1 min-w-0 p-6 space-y-6">
                  {assignmentsLoading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      Loading assignments…
                    </div>
                  ) : visibleAssignments.length === 0 && archivedAssignments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mb-3 opacity-50" />
                      <p>No assignments yet. Read a syllabus to add some.</p>
                    </div>
                  ) : (
                    <>
                      {pieTotal === 0 ? null : pieData.length > 0 ? (
                        <div className="relative h-64 w-full max-w-sm mx-auto">
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
                                onMouseEnter={(_, index) => setHoveredSliceIndex(index)}
                                onMouseLeave={() => setHoveredSliceIndex(null)}
                              >
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          {chartMode === "grades" && overallGrade !== null && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl font-semibold">
                                  {overallGrade.toFixed(2)}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Current grade
                                </div>
                              </div>
                            </div>
                          )}
                          {hoveredSlice && chartMode === "weights" && (
                            <p className="text-center text-sm text-muted-foreground mt-2">
                              {(hoveredSlice as any).fullName ?? hoveredSlice.name} – Worth{" "}
                              {round2(
                                (hoveredSlice as any).worth ?? (hoveredSlice.value as number)
                              )}
                              %
                            </p>
                          )}
                          {hoveredSlice && chartMode === "grades" && (
                            <p className="text-center text-sm text-muted-foreground mt-2">
                              {hoveredSlice.name} – {round2(hoveredSlice.value)}%
                            </p>
                          )}
                        </div>
                      ) : null}

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">All assignments</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => setArchivedModalOpen(true)}
                            disabled={archivedAssignments.length === 0}
                          >
                            Archived
                          </Button>
                        </div>
                        <ul className="space-y-2">
                          {visibleAssignments.map((a) => (
                            <li key={a.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedAssignment(a)}
                                className={`
                                  w-full text-left rounded-xl border p-4 transition-all
                                  ${
                                    selectedAssignment?.id === a.id
                                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                      : "border-border hover:bg-muted/50"
                                  }
                                `}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: a._color }}
                                    />
                                    <span className="font-medium truncate">{a.name}</span>
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-sm text-muted-foreground">
                                      {chartMode === "weights"
                                        ? `${round2(a.worth)}%`
                                        : `${round2(a.grade ?? 0)}%`}
                                    </span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleArchive(a.id, true);
                                      }}
                                      title="Archive assignment"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Due {formatDate(a.due_date)}
                                  {formatAssignmentTime(a.due_time) &&
                                    ` at ${formatAssignmentTime(a.due_time)}`}
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
                            <p>
                              {formatDate(selectedAssignment.due_date)}
                              {formatAssignmentTime(selectedAssignment.due_time)
                                ? ` at ${formatAssignmentTime(selectedAssignment.due_time)}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Worth
                            </p>
                            <p>{round2(selectedAssignment.worth)}% of grade</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            Grade
                          </p>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="0"
                            value={selectedAssignment.grade ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              const num = v === "" ? null : Number(v);
                              setSelectedAssignment((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      grade:
                                        v === ""
                                          ? null
                                          : Number.isNaN(Number(v))
                                            ? prev.grade
                                            : Number(v),
                                    }
                                  : prev
                              );
                              setAssignments((prev) =>
                                prev.map((a) =>
                                  a.id === selectedAssignment.id
                                    ? {
                                        ...a,
                                        grade:
                                          v === ""
                                            ? null
                                            : Number.isNaN(num as number)
                                              ? a.grade
                                              : (num as number),
                                      }
                                    : a
                                )
                              );
                            }}
                            onBlur={(e) => handleUpdateGrade(selectedAssignment.id, e.target.value)}
                            disabled={updatingGradeId === selectedAssignment.id}
                            className="max-w-[140px]"
                          />
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
      </div>

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

      <Modal
        open={archivedModalOpen}
        onOpenChange={setArchivedModalOpen}
        className="max-w-xl"
      >
        <ModalHeader>
          <ModalTitle>Archived assignments</ModalTitle>
        </ModalHeader>

        <div className="space-y-2 max-h-[50vh] min-h-[240px] overflow-auto pr-1">
          {archivedAssignments.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground text-center">
              No archived assignments.
            </div>
          ) : (
            archivedAssignments.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-border/80 bg-background px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Due {formatDate(a.due_date)}
                      {formatAssignmentTime(a.due_time) &&
                        ` at ${formatAssignmentTime(a.due_time)}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleToggleArchive(a.id, false)}
                  >
                    Unarchive
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal open={extractedModalOpen} onOpenChange={setExtractedModalOpen} className="max-w-2xl">
        <ModalHeader>
          <ModalTitle>New assignments</ModalTitle>
        </ModalHeader>

        <div className="text-sm text-muted-foreground mb-4">
          {extractedFromSyllabus ? (
            <>
              From <strong>{extractedFromSyllabus.file_name}</strong>. Choose which assignments to
              accept.
            </>
          ) : (
            "Choose which assignments to accept."
          )}
        </div>

        {extractedAssignments.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No new assignments found.
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
            {extractedAssignments.map((a) => (
              <div
                key={a._key}
                className="rounded-xl border border-border/80 bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.name || "Assignment"}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {a.due_date ? (
                        <>
                          Due {formatAssignmentDate(a.due_date)}
                          {formatAssignmentTime(a.due_time) &&
                            ` at ${formatAssignmentTime(a.due_time)}`}
                        </>
                      ) : (
                        "No due date"
                      )}
                      {typeof a.worth === "number" && !Number.isNaN(a.worth) ? (
                        <>
                          <span className="mx-2">•</span>
                          Worth {a.worth}%
                        </>
                      ) : null}
                    </p>
                    {(a.location || a.extra_info) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {a.location ? <span>{a.location}</span> : null}
                        {a.location && a.extra_info ? <span className="mx-2">•</span> : null}
                        {a.extra_info ? <span>{a.extra_info}</span> : null}
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleAcceptExtracted(a._key)}
                    disabled={acceptingExtractedKeys.has(a._key) || acceptAllLoading}
                  >
                    {acceptingExtractedKeys.has(a._key) ? "Adding..." : "Accept"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-5">
          <Button
            variant="secondary"
            onClick={handleAcceptAllExtracted}
            disabled={extractedAssignments.length === 0 || acceptAllLoading}
          >
            {acceptAllLoading ? "Keeping all..." : "Keep all"}
          </Button>
          <Button variant="outline" onClick={() => setExtractedModalOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}

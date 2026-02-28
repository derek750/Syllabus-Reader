import { useState } from "react";
import { Download, Trash2, Upload, FileText, Sparkles, Database } from "lucide-react";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Input } from "@/components/Input";

const API_BASE = "http://localhost:8000/api";

interface Syllabus {
  id: string;
  file_name: string;
  page_count: number;
  file_size_bytes: number;
  download_url: string;
  created_at: string;
}

interface Assignment {
  id: string;
  course_id: string;
  name: string;
  due_date: string;
  worth: number;
  extra_info?: string | null;
  location?: string | null;
  grade?: number | null;
  created_at: string;
}

interface ExtractedAssignment {
  name: string;
  due_date: string;
  worth: number | null;
  extra_info?: string | null;
  location?: string | null;
}

interface CourseWithSyllabiProps {
  courseId: string;
  courseName: string;
  courseCode?: string;
  instructor?: string;
  semester?: string;
  syllabi: Syllabus[];
  onUploadClick: () => void;
  onDeleteClick: () => void;
  onDownloadClick: (url: string) => void;
  onDeleteSyllabusClick: (syllabusId: string) => void;
  isLoading?: boolean;
  onAssignmentsRefreshed?: () => void;
}

export function CourseWithSyllabi({
  courseId,
  courseName,
  courseCode,
  instructor,
  semester,
  syllabi,
  onUploadClick,
  onDeleteClick,
  onDownloadClick,
  onDeleteSyllabusClick,
  isLoading = false,
  onAssignmentsRefreshed,
}: CourseWithSyllabiProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsVisible, setAssignmentsVisible] = useState(false);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState("");
  const [newAssignmentName, setNewAssignmentName] = useState("");
  const [newAssignmentDueDate, setNewAssignmentDueDate] = useState("");
  const [newAssignmentWorth, setNewAssignmentWorth] = useState<string>("");
  const [newAssignmentExtraInfo, setNewAssignmentExtraInfo] = useState("");
  const [newAssignmentLocation, setNewAssignmentLocation] = useState("");
  const [newAssignmentGrade, setNewAssignmentGrade] = useState<string>("");
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [saveAssignmentError, setSaveAssignmentError] = useState("");
  const [updatingGradeId, setUpdatingGradeId] = useState<string | null>(null);

  const [aiAssignmentsBySyllabus, setAiAssignmentsBySyllabus] = useState<
    Record<string, ExtractedAssignment[]>
  >({});
  const [aiAssignmentsLoadingId, setAiAssignmentsLoadingId] = useState<string | null>(
    null
  );
  const [aiAssignmentsErrorBySyllabus, setAiAssignmentsErrorBySyllabus] = useState<
    Record<string, string>
  >({});
  const [expandedSyllabusId, setExpandedSyllabusId] = useState<string | null>(null);
  const [addingToDbSyllabusId, setAddingToDbSyllabusId] = useState<string | null>(null);
  const [addToDbError, setAddToDbError] = useState("");

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const loadAssignments = async () => {
    if (assignmentsLoaded || assignmentsLoading) return;
    setAssignmentsLoading(true);
    setAssignmentsError("");

    try {
      const response = await fetch(
        `${API_BASE}/courses/${courseId}/assignments`
      );
      if (!response.ok) {
        throw new Error("Failed to load assignments");
      }

      const data = await response.json();
      setAssignments(data.assignments || []);
      setAssignmentsLoaded(true);
    } catch (error) {
      setAssignmentsError(
        error instanceof Error
          ? error.message
          : "Failed to load assignments"
      );
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const handleToggleAssignments = async () => {
    const nextVisible = !assignmentsVisible;
    setAssignmentsVisible(nextVisible);

    if (nextVisible && !assignmentsLoaded) {
      await loadAssignments();
    }
  };

  const handleAddAssignment = async () => {
    if (!courseId) return;
    setSaveAssignmentError("");
    if (!newAssignmentName.trim() || !newAssignmentDueDate || !newAssignmentWorth) {
      setSaveAssignmentError("Name, due date, and worth are required.");
      return;
    }
    const worthNumber = Number(newAssignmentWorth);
    if (Number.isNaN(worthNumber) || worthNumber <= 0) {
      setSaveAssignmentError("Worth must be a positive number.");
      return;
    }

    setSavingAssignment(true);
    try {
      const response = await fetch(`${API_BASE}/courses/${courseId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAssignmentName.trim(),
          due_date: newAssignmentDueDate,
          worth: worthNumber,
          extra_info: newAssignmentExtraInfo.trim() || null,
          location: newAssignmentLocation.trim() || null,
          grade: newAssignmentGrade.trim() ? Number(newAssignmentGrade) : null,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create assignment");
      }
      const data = await response.json();
      setAssignments((prev) => [...prev, data.assignment]);
      setAssignmentsLoaded(true);
      setAssignmentsVisible(true);
      setNewAssignmentName("");
      setNewAssignmentDueDate("");
      setNewAssignmentWorth("");
      setNewAssignmentExtraInfo("");
      setNewAssignmentLocation("");
      setNewAssignmentGrade("");
      onAssignmentsRefreshed?.();
    } catch (error) {
      setSaveAssignmentError(
        error instanceof Error ? error.message : "Failed to create assignment"
      );
    } finally {
      setSavingAssignment(false);
    }
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
        prev.map((a) => (a.id === assignmentId ? { ...a, grade: data.assignment?.grade ?? grade } : a))
      );
    } catch {
      // ignore
    } finally {
      setUpdatingGradeId(null);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    try {
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete assignment");
      }
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      onAssignmentsRefreshed?.();
    } catch (error) {
      setAssignmentsError(
        error instanceof Error ? error.message : "Failed to delete assignment"
      );
    }
  };

  const handleReadSyllabus = async (syllabusId: string) => {
    if (!syllabusId) return;
    setAiAssignmentsErrorBySyllabus((prev) => ({ ...prev, [syllabusId]: "" }));
    setAiAssignmentsLoadingId(syllabusId);
    try {
      const response = await fetch(
        `${API_BASE}/syllabi/${encodeURIComponent(syllabusId)}/extract-assignments`,
        {
          method: "POST",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to read syllabus");
      }
      const data = await response.json();
      const extracted: ExtractedAssignment[] = Array.isArray(data.assignments)
        ? data.assignments
        : [];
      setAiAssignmentsBySyllabus((prev) => ({
        ...prev,
        [syllabusId]: extracted,
      }));
      setExpandedSyllabusId(syllabusId);
    } catch (error) {
      setAiAssignmentsErrorBySyllabus((prev) => ({
        ...prev,
        [syllabusId]:
          error instanceof Error ? error.message : "Failed to read syllabus",
      }));
    } finally {
      setAiAssignmentsLoadingId(null);
    }
  };

  const handleAddExtractedToDatabase = async (syllabusId: string) => {
    const extracted = aiAssignmentsBySyllabus[syllabusId] || [];
    if (extracted.length === 0 || !courseId) return;
    setAddToDbError("");
    setAddingToDbSyllabusId(syllabusId);
    try {
      const created: Assignment[] = [];
      for (const a of extracted) {
        const worth = typeof a.worth === "number" && !Number.isNaN(a.worth) ? a.worth : 0;
        const dueDate = a.due_date || new Date().toISOString().slice(0, 10);
        const response = await fetch(`${API_BASE}/courses/${courseId}/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: a.name?.trim() || "Assignment",
            due_date: dueDate,
            worth,
            extra_info: a.extra_info?.trim() || null,
            location: a.location?.trim() || null,
          }),
        });
        if (!response.ok) throw new Error("Failed to create an assignment");
        const data = await response.json();
        created.push(data.assignment);
      }
      setAssignments((prev) => [...prev, ...created]);
      setAssignmentsLoaded(true);
      setAssignmentsVisible(true);
      onAssignmentsRefreshed?.();
      setAiAssignmentsBySyllabus((prev) => ({
        ...prev,
        [syllabusId]: [],
      }));
    } catch (error) {
      setAddToDbError(
        error instanceof Error ? error.message : "Failed to add assignments to database"
      );
    } finally {
      setAddingToDbSyllabusId(null);
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-border/80">
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">{courseName}</CardTitle>
              <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                {courseCode && <span>{courseCode}</span>}
                {instructor && <span>{instructor}</span>}
                {semester && <span>{semester}</span>}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDeleteClick}
              disabled={isLoading}
              title="Delete course"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Syllabi Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Syllabi</h4>
            <Button
              size="sm"
              onClick={onUploadClick}
              disabled={isLoading}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload
            </Button>
          </div>

          {syllabi.length === 0 ? (
            <div className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
              No syllabi uploaded yet
            </div>
          ) : (
            <div className="space-y-3">
              {syllabi.map((syllabus) => {
                const aiAssignments = aiAssignmentsBySyllabus[syllabus.id] || [];
                const aiError = aiAssignmentsErrorBySyllabus[syllabus.id];
                const isAiLoading = aiAssignmentsLoadingId === syllabus.id;

                return (
                  <div key={syllabus.id} className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {syllabus.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {syllabus.page_count} page
                            {syllabus.page_count !== 1 ? "s" : ""} •{" "}
                            {formatFileSize(syllabus.file_size_bytes)} •{" "}
                            {formatDate(syllabus.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => handleReadSyllabus(syllabus.id)}
                          disabled={isLoading || isAiLoading}
                          title="Read syllabus and extract assignments"
                        >
                          <Sparkles className="w-4 h-4" />
                          {isAiLoading ? "Reading..." : "Read"}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDownloadClick(syllabus.download_url)}
                          disabled={isLoading}
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDeleteSyllabusClick(syllabus.id)}
                          disabled={isLoading}
                          title="Delete syllabus"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {expandedSyllabusId === syllabus.id && (
                      <div className="ml-7 rounded-lg border border-dashed p-3 bg-background/60 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            AI-generated assignments from this syllabus
                          </p>
                          {aiAssignments.length > 0 && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="gap-1.5"
                              onClick={() => handleAddExtractedToDatabase(syllabus.id)}
                              disabled={addingToDbSyllabusId !== null}
                            >
                              <Database className="w-3.5 h-3.5" />
                              {addingToDbSyllabusId === syllabus.id
                                ? "Adding..."
                                : "Add all to course"}
                            </Button>
                          )}
                        </div>
                        {addToDbError && (
                          <div className="text-xs text-red-600">{addToDbError}</div>
                        )}
                        {aiError ? (
                          <div className="text-xs text-red-600">{aiError}</div>
                        ) : isAiLoading ? (
                          <div className="text-xs text-muted-foreground">
                            Reading syllabus and extracting assignments...
                          </div>
                        ) : aiAssignments.length === 0 ? (
                          <div className="text-xs text-muted-foreground">
                            No assignments found yet. Click &quot;Read&quot; to analyze this
                            syllabus.
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {aiAssignments.map((a, index) => (
                              <div
                                key={`${syllabus.id}-ai-${index}`}
                                className="text-xs bg-muted/40 rounded-md px-2 py-1.5"
                              >
                                <div className="font-medium truncate">{a.name}</div>
                                <div className="text-muted-foreground">
                                  {a.due_date && (
                                    <>
                                      Due {formatDate(a.due_date)}{" "}
                                      <span className="mx-1">•</span>
                                    </>
                                  )}
                                  {typeof a.worth === "number" &&
                                    !Number.isNaN(a.worth) && (
                                      <>
                                        Worth {a.worth}%{" "}
                                        {(a.location || a.extra_info) && (
                                          <span className="mx-1">•</span>
                                        )}
                                      </>
                                    )}
                                  {a.location}
                                  {a.location && a.extra_info && (
                                    <span className="mx-1">•</span>
                                  )}
                                  {a.extra_info}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Assignments Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Assignments</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleAssignments}
              disabled={assignmentsLoading}
              className="gap-2"
            >
              {assignmentsVisible ? "Hide" : "Show"}
            </Button>
          </div>

          {assignmentsVisible && (
            <div className="space-y-3">
              <div className="space-y-2 rounded-lg border border-dashed p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Add a new assignment
                </p>
                <div className="grid gap-2 md:grid-cols-[2fr,1.2fr,0.8fr]">
                  <Input
                    placeholder="Assignment name"
                    value={newAssignmentName}
                    onChange={(e) => setNewAssignmentName(e.target.value)}
                    disabled={savingAssignment}
                  />
                  <Input
                    type="date"
                    value={newAssignmentDueDate}
                    onChange={(e) => setNewAssignmentDueDate(e.target.value)}
                    disabled={savingAssignment}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Worth %"
                    value={newAssignmentWorth}
                    onChange={(e) => setNewAssignmentWorth(e.target.value)}
                    disabled={savingAssignment}
                  />
                </div>
                <Input
                  placeholder="Extra info (optional)"
                  value={newAssignmentExtraInfo}
                  onChange={(e) => setNewAssignmentExtraInfo(e.target.value)}
                  disabled={savingAssignment}
                />
                <Input
                  placeholder="Location (optional)"
                  value={newAssignmentLocation}
                  onChange={(e) => setNewAssignmentLocation(e.target.value)}
                  disabled={savingAssignment}
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Grade (optional)"
                  value={newAssignmentGrade}
                  onChange={(e) => setNewAssignmentGrade(e.target.value)}
                  disabled={savingAssignment}
                  className="max-w-[120px]"
                />
                <div className="flex items-center justify-between">
                  <Button
                    size="sm"
                    onClick={handleAddAssignment}
                    disabled={savingAssignment}
                  >
                    {savingAssignment ? "Saving..." : "Add assignment"}
                  </Button>
                  {saveAssignmentError && (
                    <span className="text-xs text-red-600">
                      {saveAssignmentError}
                    </span>
                  )}
                </div>
              </div>

              {assignmentsLoading ? (
                <div className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
                  Loading assignments...
                </div>
              ) : assignmentsError ? (
                <div className="text-sm text-red-600 rounded-lg border border-red-200 p-4">
                  {assignmentsError}
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
                  No assignments yet
                </div>
              ) : (
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {assignment.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Due {formatDate(assignment.due_date)} • Worth{" "}
                          {assignment.worth}
                          %
                          {assignment.grade != null
                            ? ` • Grade: ${assignment.grade}`
                            : ""}
                          {assignment.location
                            ? ` • ${assignment.location}`
                            : ""}
                          {assignment.extra_info
                            ? ` • ${assignment.extra_info}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="Grade"
                          value={assignment.grade ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            const num = v === "" ? null : Number(v);
                            setAssignments((prev) =>
                              prev.map((a) =>
                                a.id === assignment.id
                                  ? {
                                      ...a,
                                      grade:
                                        v === ""
                                          ? null
                                          : Number.isNaN(Number(v))
                                            ? a.grade
                                            : Number(v),
                                    }
                                  : a
                              )
                            );
                          }}
                          onBlur={(e) =>
                            handleUpdateGrade(assignment.id, e.target.value)
                          }
                          disabled={updatingGradeId === assignment.id}
                          className="w-16 h-8 text-sm text-right"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          title="Delete assignment"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

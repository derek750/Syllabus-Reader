import { useState } from "react";
import { Download, Trash2, Upload, FileText } from "lucide-react";
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
  created_at: string;
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
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [saveAssignmentError, setSaveAssignmentError] = useState("");

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
    } catch (error) {
      setSaveAssignmentError(
        error instanceof Error ? error.message : "Failed to create assignment"
      );
    } finally {
      setSavingAssignment(false);
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
    } catch (error) {
      setAssignmentsError(
        error instanceof Error ? error.message : "Failed to delete assignment"
      );
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{courseName}</CardTitle>
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
            <div className="space-y-2">
              {syllabi.map((syllabus) => (
                <div
                  key={syllabus.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
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
              ))}
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
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {assignment.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Due {formatDate(assignment.due_date)} • Worth{" "}
                          {assignment.worth}
                          %
                          {assignment.extra_info
                            ? ` • ${assignment.extra_info}`
                            : ""}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        title="Delete assignment"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
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

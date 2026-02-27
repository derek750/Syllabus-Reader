import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal, ModalHeader, ModalTitle } from "@/components/Modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

interface CreateCourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    course_name: string;
    course_code?: string;
    semester?: string;
    instructor?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function CreateCourseModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: CreateCourseModalProps) {
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [semester, setSemester] = useState("");
  const [instructor, setInstructor] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!courseName.trim()) {
      setError("Course name is required");
      return;
    }

    try {
      await onSubmit({
        course_name: courseName,
        course_code: courseCode || undefined,
        semester: semester || undefined,
        instructor: instructor || undefined,
      });

      setCourseName("");
      setCourseCode("");
      setSemester("");
      setInstructor("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalHeader>
        <ModalTitle>Create New Course</ModalTitle>
      </ModalHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Course Name *</label>
          <Input
            placeholder="e.g., Introduction to Computer Science"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Course Code</label>
          <Input
            placeholder="e.g., CS101"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Semester</label>
          <Input
            placeholder="e.g., Fall 2024"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Instructor</label>
          <Input
            placeholder="e.g., Dr. Smith"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Course"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

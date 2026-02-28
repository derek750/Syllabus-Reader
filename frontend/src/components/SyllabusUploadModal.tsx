import { useState, useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal, ModalHeader, ModalTitle } from "@/components/Modal";

interface SyllabusUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (file: File) => Promise<void>;
  isLoading?: boolean;
  courseId: string;
  courseName: string;
}

export function SyllabusUploadModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  courseId,
  courseName,
}: SyllabusUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError("");

    if (!file.name.endsWith(".pdf")) {
      setError("Please select a PDF file");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      // 50MB limit
      setError("File size must be less than 50MB");
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    try {
      await onSubmit(selectedFile);
      setSelectedFile(null);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload syllabus");
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalHeader>
        <ModalTitle>Upload Syllabus</ModalTitle>
      </ModalHeader>

      <div className="text-sm text-muted-foreground mb-4">
        Uploading syllabus for <strong>{courseName}</strong>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleInputChange}
            disabled={isLoading}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              <div className="text-left">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">Drop your PDF here, or click to select</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF files up to 50MB are supported
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 text-destructive border border-destructive/20 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!selectedFile || isLoading}>
            {isLoading ? "Uploading..." : "Upload Syllabus"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

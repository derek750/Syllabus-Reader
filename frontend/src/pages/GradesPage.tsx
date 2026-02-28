import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, GraduationCap } from "lucide-react";
import { useStore } from "@/store";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Input } from "@/components/Input";
import { Modal, ModalHeader, ModalTitle } from "@/components/Modal";
import { Select } from "@/components/Select";
import { GradeCategoryCard } from "@/pages/grades/GradeCategoryCard";

const API_BASE = "http://localhost:8000/api";
const COURSE_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4",
];

function colorForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COURSE_COLORS[h % COURSE_COLORS.length];
}

function getCatAvg(
  catId: string,
  grades: ReturnType<typeof useStore>["grades"]
): number | null {
  const catGrades = grades.filter((g) => g.category_id === catId && g.score !== null);
  if (!catGrades.length) return null;
  return (
    catGrades.reduce((s, g) => s + (g.score! / g.max_score) * 100, 0) / catGrades.length
  );
}

function getCourseAvg(
  categories: ReturnType<typeof useStore>["categories"],
  grades: ReturnType<typeof useStore>["grades"]
): number | null {
  if (!categories.length) return null;
  let totalWeighted = 0;
  let totalWeight = 0;
  for (const cat of categories) {
    const avg = getCatAvg(cat.id, grades);
    if (avg === null) continue;
    totalWeighted += avg * cat.weight;
    totalWeight += cat.weight;
  }
  return totalWeight > 0 ? totalWeighted / totalWeight : null;
}

export function GradesPage() {
  const {
    courses,
    setCourses,
    categories,
    grades,
    addCategory,
    deleteCategory,
    addGrade,
    deleteGrade,
  } = useStore();
  const [selectedCourse, setSelectedCourse] = useState("");
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addGradeOpen, setAddGradeOpen] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", weight: "" });
  const [newGrade, setNewGrade] = useState({
    name: "",
    score: "",
    maxScore: "100",
    categoryId: "",
  });

  const loadCourses = useCallback(async () => {
    try {
      const userRaw = localStorage.getItem("user");
      if (!userRaw) return;
      const parsed = JSON.parse(userRaw);
      const userId = parsed?.id;
      if (!userId) return;
      const res = await fetch(`${API_BASE}/courses?user_id=${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data?.courses) ? data.courses : [];
      const normalized = rows.map((c: { id: string; course_name?: string; name?: string; semester?: string; color?: string; created_at?: string; updated_at?: string }) => ({
        id: String(c.id ?? ""),
        name: String(c.course_name ?? c.name ?? ""),
        semester: c.semester ?? null,
        color: String(c.color ?? colorForId(String(c.id))),
        syllabus_path: null,
        created_at: String(c.created_at ?? new Date().toISOString()),
        updated_at: String(c.updated_at ?? c.created_at ?? new Date().toISOString()),
      }));
      setCourses(normalized);
    } catch {
      // ignore
    }
  }, [setCourses]);

  useEffect(() => {
    if (courses.length === 0) loadCourses();
  }, [courses.length, loadCourses]);

  const courseCats = categories.filter((c) => c.course_id === selectedCourse);
  const courseAvg = getCourseAvg(courseCats, grades);

  const handleAddCategory = () => {
    if (!selectedCourse || !newCat.name.trim() || !newCat.weight) return;
    addCategory(selectedCourse, newCat.name.trim(), parseFloat(newCat.weight));
    setAddCatOpen(false);
    setNewCat({ name: "", weight: "" });
  };

  const handleAddGrade = () => {
    if (!newGrade.name.trim() || !newGrade.categoryId) return;
    addGrade(
      newGrade.categoryId,
      newGrade.name.trim(),
      newGrade.score ? parseFloat(newGrade.score) : null,
      parseFloat(newGrade.maxScore)
    );
    setAddGradeOpen(false);
    setNewGrade({ name: "", score: "", maxScore: "100", categoryId: "" });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-heading">Grade Tracker</h1>
          <p className="text-muted-foreground mt-1">Track categories and grades by course</p>
        </div>
        <Select
          value={selectedCourse}
          onValueChange={setSelectedCourse}
          options={courses.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Select a course"
          className="w-56 md:w-64"
        />
      </div>

      {!selectedCourse ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mb-3" />
            <p>Select a course to view and manage grades</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {courseAvg !== null && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground">Weighted Course Average</p>
                  <p className="text-3xl font-bold">{courseAvg.toFixed(1)}%</p>
                </div>
                <div className="h-16 w-16 rounded-full border-4 border-primary flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {courseAvg >= 90 ? "A" : courseAvg >= 80 ? "B" : courseAvg >= 70 ? "C" : courseAvg >= 60 ? "D" : "F"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setAddCatOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
            <Button
              size="sm"
              className="gap-1"
              disabled={!courseCats.length}
              onClick={() => setAddGradeOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Grade
            </Button>
          </div>

          {!courseCats.length ? (
            <p className="text-muted-foreground text-sm">
              No grade categories yet. Add categories manually.
            </p>
          ) : (
            <div className="space-y-4">
              {courseCats.map((cat) => (
                <GradeCategoryCard
                  key={cat.id}
                  category={cat}
                  grades={grades.filter((g) => g.category_id === cat.id)}
                  avg={getCatAvg(cat.id, grades)}
                  onDeleteCategory={() => deleteCategory(cat.id)}
                  onDeleteGrade={deleteGrade}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={addCatOpen} onOpenChange={setAddCatOpen}>
        <ModalHeader>
          <ModalTitle>Add Grade Category</ModalTitle>
        </ModalHeader>
        <div className="space-y-4">
          <Input
            placeholder="Category name (e.g., Exams)"
            value={newCat.name}
            onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
          />
          <Input
            placeholder="Weight %"
            type="number"
            value={newCat.weight}
            onChange={(e) => setNewCat({ ...newCat, weight: e.target.value })}
          />
          <Button
            className="w-full"
            disabled={!newCat.name.trim() || !newCat.weight}
            onClick={handleAddCategory}
          >
            Add Category
          </Button>
        </div>
      </Modal>

      <Modal open={addGradeOpen} onOpenChange={setAddGradeOpen}>
        <ModalHeader>
          <ModalTitle>Add Grade Entry</ModalTitle>
        </ModalHeader>
        <div className="space-y-4">
          <Input
            placeholder="Assignment name"
            value={newGrade.name}
            onChange={(e) => setNewGrade({ ...newGrade, name: e.target.value })}
          />
          <Select
            value={newGrade.categoryId}
            onValueChange={(v) => setNewGrade({ ...newGrade, categoryId: v })}
            options={courseCats.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.weight}%)`,
            }))}
            placeholder="Select category"
          />
          <div className="flex gap-2">
            <Input
              placeholder="Score"
              type="number"
              value={newGrade.score}
              onChange={(e) => setNewGrade({ ...newGrade, score: e.target.value })}
            />
            <Input
              placeholder="Max"
              type="number"
              value={newGrade.maxScore}
              onChange={(e) => setNewGrade({ ...newGrade, maxScore: e.target.value })}
            />
          </div>
          <Button
            className="w-full"
            disabled={!newGrade.name.trim() || !newGrade.categoryId}
            onClick={handleAddGrade}
          >
            Add Grade
          </Button>
        </div>
      </Modal>
    </div>
  );
}

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Course, Event, GradeCategory, Grade } from "./types";

const LEGACY_STORAGE_KEYS = [
  "syllabus-reader-courses",
  "syllabus-reader-events",
  "syllabus-reader-grade-categories",
  "syllabus-reader-grades",
] as const;

function uuid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface AppState {
  courses: Course[];
  events: Event[];
  categories: GradeCategory[];
  grades: Grade[];
}

interface StoreActions {
  addCourse: (name: string, semester: string | null) => void;
  setCourses: (courses: Course[]) => void;
  deleteCourse: (id: string) => void;
  reset: () => void;
  addEvent: (event: Omit<Event, "id" | "created_at">) => void;
  deleteEvent: (id: string) => void;
  addCategory: (courseId: string, name: string, weight: number) => void;
  deleteCategory: (id: string) => void;
  addGrade: (categoryId: string, name: string, score: number | null, maxScore: number) => void;
  deleteGrade: (id: string) => void;
}

const COURSE_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4",
];

const StoreContext = createContext<(AppState & StoreActions) | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  useEffect(() => {
    // Ensure we don't persist app state in localStorage (only user info is allowed).
    try {
      for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, []);

  const addCourse = useCallback((name: string, semester: string | null) => {
    const now = new Date().toISOString();
    const colorIdx = courses.length % COURSE_COLORS.length;
    setCourses((prev) => [
      ...prev,
      {
        id: uuid(),
        name,
        semester: semester || null,
        color: COURSE_COLORS[colorIdx],
        syllabus_path: null,
        created_at: now,
        updated_at: now,
      },
    ]);
  }, [courses.length]);

  const setCoursesFromServer = useCallback((newCourses: Course[]) => {
    setCourses(newCourses);
  }, []);

  const deleteCourse = useCallback((id: string) => {
    const categoryIdsToRemove = categories.filter((c) => c.course_id === id).map((c) => c.id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setEvents((prev) => prev.filter((e) => e.course_id !== id));
    setCategories((prev) => prev.filter((c) => c.course_id !== id));
    setGrades((prev) => prev.filter((g) => !categoryIdsToRemove.includes(g.category_id)));
  }, [categories]);

  const reset = useCallback(() => {
    setCourses([]);
    setEvents([]);
    setCategories([]);
    setGrades([]);
  }, []);

  const addEvent = useCallback((event: Omit<Event, "id" | "created_at">) => {
    setEvents((prev) => [
      ...prev,
      {
        ...event,
        id: uuid(),
        created_at: new Date().toISOString(),
      },
    ]);
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addCategory = useCallback((courseId: string, name: string, weight: number) => {
    setCategories((prev) => [
      ...prev,
      {
        id: uuid(),
        course_id: courseId,
        name,
        weight,
        created_at: new Date().toISOString(),
      },
    ]);
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setGrades((prev) => prev.filter((g) => g.category_id !== id));
  }, []);

  const addGrade = useCallback((
    categoryId: string,
    name: string,
    score: number | null,
    maxScore: number
  ) => {
    setGrades((prev) => [
      ...prev,
      {
        id: uuid(),
        category_id: categoryId,
        name,
        score,
        max_score: maxScore,
        created_at: new Date().toISOString(),
      },
    ]);
  }, []);

  const deleteGrade = useCallback((id: string) => {
    setGrades((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const value: AppState & StoreActions = {
    courses,
    events,
    categories,
    grades,
    addCourse,
    setCourses: setCoursesFromServer,
    deleteCourse,
    reset,
    addEvent,
    deleteEvent,
    addCategory,
    deleteCategory,
    addGrade,
    deleteGrade,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

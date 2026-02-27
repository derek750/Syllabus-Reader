export interface Course {
  id: string;
  name: string;
  semester: string | null;
  color: string;
  syllabus_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  course_id: string;
  type: string;
  title: string;
  description: string | null;
  event_date: string;
  created_at: string;
}

export interface GradeCategory {
  id: string;
  course_id: string;
  name: string;
  weight: number;
  created_at: string;
}

export interface Grade {
  id: string;
  category_id: string;
  name: string;
  score: number | null;
  max_score: number;
  created_at: string;
}

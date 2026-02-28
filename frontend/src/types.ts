export interface Course {
  id: string;
  name: string;
  code?: string | null;
  semester: string | null;
  color: string;
  syllabus_path: string | null;
  created_at: string;
  updated_at: string;
  average_grade?: number | null;
}

export interface Assignment {
  id: string;
  course_id: string;
  name: string;
  due_date: string | null;
  due_time?: string | null;
  worth: number;
  extra_info?: string | null;
  location?: string | null;
  grade?: number | null;
  archived?: boolean | null;
  created_at: string;
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

-- Assignments table (composed schema: create + all column edits).
-- Run in the Supabase SQL editor or via psql. Requires public.courses to exist.

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  due_date timestamptz,
  due_time time,
  worth numeric NOT NULL,
  extra_info text,
  location text,
  grade numeric,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON public.assignments (course_id);

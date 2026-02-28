-- Create assignments table for storing course assignments
-- Run this in the Supabase SQL editor or via psql connected to your project.

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  due_date timestamptz NOT NULL,
  worth numeric NOT NULL,
  extra_info text,
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index on course_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON public.assignments (course_id);


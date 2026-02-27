-- Create courses and syllabi tables for storing user courses and their syllabi PDFs

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_name text NOT NULL,
  course_code text,
  semester text,
  instructor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON public.courses (user_id);

CREATE TABLE IF NOT EXISTS public.syllabi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes integer,
  page_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Index on course_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_syllabi_course_id ON public.syllabi (course_id);

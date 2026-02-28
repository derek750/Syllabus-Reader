-- Add optional due_time column for assignment due time of day.
-- Run in the Supabase SQL editor or via psql if you already have the assignments table.

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS due_time time;

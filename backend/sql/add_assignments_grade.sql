-- Add optional grade column to assignments (user's received grade).
-- Run in Supabase SQL editor or via psql if you already have the assignments table.

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS grade numeric;

-- Add optional location column to assignments (for existing databases).
-- Run in Supabase SQL editor or via psql if you already have the assignments table.

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS location text;

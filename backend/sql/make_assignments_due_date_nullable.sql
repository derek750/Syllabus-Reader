-- Allow assignments to have no due date (e.g. extracted items with unknown date).
-- Run in the Supabase SQL editor or via psql.

ALTER TABLE public.assignments
  ALTER COLUMN due_date DROP NOT NULL;

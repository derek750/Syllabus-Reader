-- Add archived flag to assignments so users can hide completed/unused items
-- Run this in Supabase after the other assignment migrations.

ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT FALSE;


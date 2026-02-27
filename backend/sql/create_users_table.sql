-- Create a minimal `users` table compatible with the backend code.
-- Run this in the Supabase SQL editor or via psql connected to your project.

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  provider text NOT NULL DEFAULT 'google',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_sign_in_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Optional: index on email for faster lookups (email is already unique)
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- Example insert to test (replace email):
-- INSERT INTO public.users (email, provider) VALUES ('demo@example.com', 'google');

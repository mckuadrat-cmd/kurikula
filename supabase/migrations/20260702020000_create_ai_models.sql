-- Create ai_models table
CREATE TABLE IF NOT EXISTS public.ai_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_string TEXT NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tier_restriction TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for select (read) access for all authenticated users
DROP POLICY IF EXISTS "Allow read access to all users" ON public.ai_models;
CREATE POLICY "Allow read access to all users" ON public.ai_models
  FOR SELECT USING (true);

-- Add RLS policy for write operations (insert, update, delete) for super admins
DROP POLICY IF EXISTS "Allow write access for super admins" ON public.ai_models;
CREATE POLICY "Allow write access for super admins" ON public.ai_models
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'mckuadratid@gmail.com' 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin'
  );

-- Seed initial models
INSERT INTO public.ai_models (id, name, api_string, multiplier, is_active, tier_restriction)
VALUES 
  ('gemini-flash', 'Gemini 2.5 Flash', 'gemini-2.5-flash', 1, true, ARRAY['basic', 'pro', 'premium', 'school', 'trial']),
  ('gemini-pro', 'Gemini 2.5 Pro', 'gemini-2.5-pro', 2, true, ARRAY['pro', 'premium', 'school', 'trial']),
  ('gemini-3.5-flash', 'Gemini 3.5 Flash', 'gemini-3.5-flash', 1, true, ARRAY['basic', 'pro', 'premium', 'school', 'trial']),
  ('gemini-3.1-pro', 'Gemini 3.1 Pro', 'gemini-3.1-pro', 2, true, ARRAY['pro', 'premium', 'school', 'trial'])
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  api_string = EXCLUDED.api_string,
  multiplier = EXCLUDED.multiplier,
  is_active = EXCLUDED.is_active,
  tier_restriction = EXCLUDED.tier_restriction,
  updated_at = timezone('utc'::text, now());

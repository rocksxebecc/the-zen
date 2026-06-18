-- Run this in your Supabase SQL Editor:
-- Adds welcome_email_sent column to public.profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT FALSE;

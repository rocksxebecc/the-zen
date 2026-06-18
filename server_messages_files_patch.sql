-- Run this in your Supabase SQL Editor:
-- Adds file sharing columns to public.server_messages

ALTER TABLE public.server_messages
  ADD COLUMN IF NOT EXISTS msg_type TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_size INTEGER;

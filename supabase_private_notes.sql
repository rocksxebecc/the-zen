-- ================================================================
-- ZENSPACE — Private Notes SQL Patch
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ================================================================

-- 1. Add is_private column to notes table (default is public)
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- 2. Add private_notes_password_hash column to profiles table to store password securely
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS private_notes_password_hash TEXT;

-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- Adds RLS policies for Admins to manage subscriptions and ban users.

-- 1. Add is_banned column to public.profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- 2. Drop existing policies to allow re-running this script
DROP POLICY IF EXISTS "Admins select all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins update all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins delete all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;

-- 3. Create Admin policies for Subscriptions
CREATE POLICY "Admins select all subscriptions" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins update all subscriptions" ON public.subscriptions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins delete all subscriptions" ON public.subscriptions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 4. Create Admin policy to ban/unban profiles
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

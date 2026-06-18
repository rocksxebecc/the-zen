-- ============================================================
--  Zenspace — Fix Admin RLS Infinite Recursion
--  Run this in your Supabase SQL Editor FIRST
--  This fixes the recursive "Admins select all profiles" policy
-- ============================================================

-- 1. Drop the broken recursive policy
DROP POLICY IF EXISTS "Admins select all profiles" ON public.profiles;

-- 2. Create a SECURITY DEFINER helper that bypasses RLS to safely
--    check if the current user is an admin (no recursion possible)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- 3. Re-create the admin profile policy using the safe function
--    (no longer self-referencing)
CREATE POLICY "Admins select all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin_user());

-- 4. Also fix the admin_delete_user function to use is_admin_user()
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verify caller is admin (uses the safe function — no RLS recursion)
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('error', 'Unauthorized: admin only');
  END IF;

  -- Cannot delete yourself
  IF target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('error', 'Cannot delete your own account');
  END IF;

  -- Delete dependent data
  DELETE FROM public.user_sessions    WHERE user_id = target_user_id;
  DELETE FROM public.subscriptions    WHERE user_id = target_user_id;
  DELETE FROM public.payments         WHERE user_id = target_user_id;
  DELETE FROM public.messages         WHERE sender_id = target_user_id;
  DELETE FROM public.friend_requests
    WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  DELETE FROM public.conversation_members WHERE user_id = target_user_id;
  DELETE FROM public.server_members   WHERE user_id = target_user_id;
  DELETE FROM public.notes            WHERE user_id = target_user_id;
  DELETE FROM public.profiles         WHERE id = target_user_id;

  -- Delete the auth user
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

-- 5. Fix the admin_actions_patch subscriptions policy too
DROP POLICY IF EXISTS "Admins select all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins select all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins update all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins update all subscriptions" ON public.subscriptions
  FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins delete all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins delete all subscriptions" ON public.subscriptions
  FOR DELETE USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins read all sessions" ON public.user_sessions;
CREATE POLICY "Admins read all sessions" ON public.user_sessions
  FOR SELECT USING (public.is_admin_user());

-- Done! The is_admin_user() SECURITY DEFINER function bypasses RLS
-- so it never causes infinite recursion.

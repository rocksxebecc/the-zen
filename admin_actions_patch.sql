-- ============================================================
--  Zenspace — Admin Actions Patch
--  Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Allow admins to SELECT all profiles (needed for user search)
DROP POLICY IF EXISTS "Admins select all profiles" ON public.profiles;
CREATE POLICY "Admins select all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.is_admin = true)
  );

-- 2. Admin function to fully delete a user and all their data
--    Uses SECURITY DEFINER so it can delete from auth.users
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _caller_is_admin boolean;
BEGIN
  -- Verify the caller is an admin
  SELECT is_admin INTO _caller_is_admin
    FROM public.profiles WHERE id = auth.uid();

  IF NOT _caller_is_admin THEN
    RETURN jsonb_build_object('error', 'Unauthorized: admin only');
  END IF;

  -- Cannot delete yourself
  IF target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('error', 'Cannot delete your own account');
  END IF;

  -- Delete dependent data in order
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

  -- Finally delete the auth user
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute to authenticated users (the function itself checks for admin)
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

-- 3. Allow admins to read all profiles with subscription join
DROP POLICY IF EXISTS "Admins select all payments" ON public.payments;
CREATE POLICY "Admins select all payments" ON public.payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ================================================================
-- ZENSPACE — Fix Server Invites RLS
-- Run this in Supabase Dashboard → SQL Editor
-- ================================================================

-- This policy originally only allowed users to insert themselves.
-- We are broadening it so that if you are ALREADY a member of the server,
-- you can add other users to it.
DROP POLICY IF EXISTS "Users can join servers" ON public.server_members;

CREATE POLICY "Users can join servers or be added by members"
  ON public.server_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR 
    public.is_server_member(server_id)
  );

-- Done! Now the "Add" button in the invite search will work correctly.

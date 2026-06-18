-- ============================================================
--  Zenspace — User Activity Analytics Schema
--  Run this in your Supabase SQL Editor
-- ============================================================

-- 1. User Sessions table (tracks each page visit)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) NOT NULL,
  page         text NOT NULL DEFAULT 'dashboard',
  started_at   timestamptz NOT NULL DEFAULT now(),
  ended_at     timestamptz,
  heartbeat_at timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now()
);

-- Computed column helper function for duration
CREATE OR REPLACE FUNCTION session_duration_seconds(s public.user_sessions)
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT CASE 
    WHEN s.ended_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (s.ended_at - s.started_at))::integer
    ELSE
      EXTRACT(EPOCH FROM (s.heartbeat_at - s.started_at))::integer
  END;
$$;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Users manage own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins read all sessions" ON public.user_sessions;

-- Users can insert/update their own sessions
CREATE POLICY "Users manage own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Admins can read all sessions for analytics
CREATE POLICY "Admins read all sessions" ON public.user_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Index for fast date-range queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_date
  ON public.user_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_date
  ON public.user_sessions (started_at DESC);

-- 2. Helper: daily stats view (used by admin analytics)
CREATE OR REPLACE VIEW public.daily_user_stats AS
SELECT
  date_trunc('day', started_at AT TIME ZONE 'UTC') AS day,
  COUNT(DISTINCT user_id) AS active_users,
  COUNT(*) AS total_sessions,
  ROUND(AVG(
    EXTRACT(EPOCH FROM (
      COALESCE(ended_at, heartbeat_at) - started_at
    ))
  ))::integer AS avg_session_seconds
FROM public.user_sessions
WHERE started_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY 1;

-- 3. Helper: per-user stats view
CREATE OR REPLACE VIEW public.user_activity_stats AS
SELECT
  p.id AS user_id,
  p.username,
  p.display_name,
  p.avatar_emoji,
  p.avatar_color,
  COUNT(DISTINCT date_trunc('day', s.started_at)) AS active_days,
  COUNT(s.id) AS total_sessions,
  COALESCE(SUM(
    EXTRACT(EPOCH FROM (
      COALESCE(s.ended_at, s.heartbeat_at) - s.started_at
    ))
  )::integer, 0) AS total_seconds,
  MAX(COALESCE(s.heartbeat_at, s.started_at)) AS last_seen
FROM public.profiles p
LEFT JOIN public.user_sessions s ON p.id = s.user_id
GROUP BY p.id, p.username, p.display_name, p.avatar_emoji, p.avatar_color;

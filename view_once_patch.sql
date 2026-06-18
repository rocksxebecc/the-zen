-- View Once feature: add view_once columns to messages table
-- Run this in your Supabase SQL editor

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS view_once          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS view_once_duration integer DEFAULT 0;

-- view_once          : true = recipient can only view once
-- view_once_duration : 0 = unlimited (until navigates away), 3/10/30 = seconds visible (images only)
-- For videos: view_once = true, view_once_duration is ignored (always unlimited until end/backout)

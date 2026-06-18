-- Run this in your Supabase SQL Editor to update the default price to ₹99:
ALTER TABLE public.subscriptions 
  ALTER COLUMN amount SET DEFAULT 9900;

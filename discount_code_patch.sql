-- ============================================================
--  Zenspace — Discount Code Patch
--  Adds discount_percentage to promo_codes table
--  Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add discount_percentage column to promo_codes
--    0   = full free access code (existing behaviour)
--    1-99 = percentage discount applied at Razorpay checkout
--    100  = 100% off (treated as free access code, no payment)
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS discount_percentage INT NOT NULL DEFAULT 0
  CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

COMMENT ON COLUMN public.promo_codes.discount_percentage IS
  '0 = free access code; 1-99 = % discount on ₹99 applied at checkout; 100 = full discount (free)';

-- ============================================================
--  That's it! The dashboard handles the rest:
--    • Admin panel "Access Codes" tab now shows a Discount % field
--    • Paywall "Have a promo code?" applies the discount live
--    • 0% / 100% codes still redeem immediately (free access)
--    • 1-99% codes reduce the Razorpay charge and record the
--      redemption after successful payment
-- ============================================================

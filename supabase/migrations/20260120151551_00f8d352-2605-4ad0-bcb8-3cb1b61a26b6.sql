-- Add razorpay_payment_id column to subscriptions for idempotency check
-- This prevents duplicate credit grants if payment callback is received multiple times
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS razorpay_payment_id text;
-- Add plan expiry tracking columns
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Function to automatically expire plans
-- CRITICAL: Only updates plan status, NEVER touches credits
CREATE OR REPLACE FUNCTION public.check_and_expire_plans()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  expired_count integer;
  expired_user RECORD;
BEGIN
  -- Update expired Pro/ProPlus plans to free
  -- CRITICAL: Only update plan fields, NOT credits
  WITH expired AS (
    UPDATE public.subscriptions
    SET 
      plan = 'free',
      plan_started_at = NULL,
      plan_expires_at = NULL,
      updated_at = now()
    WHERE plan_expires_at <= now()
      AND plan IN ('pro', 'proplus')
    RETURNING user_id, plan
  )
  SELECT count(*) INTO expired_count FROM expired;
  
  RETURN expired_count;
END;
$$;

-- RPC function to get plan expiry status for a user
CREATE OR REPLACE FUNCTION public.get_plan_expiry_status(_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'plan', s.plan,
    'plan_started_at', s.plan_started_at,
    'plan_expires_at', s.plan_expires_at,
    'is_expired', CASE 
      WHEN s.plan_expires_at IS NULL THEN false
      WHEN s.plan_expires_at <= now() THEN true
      ELSE false
    END,
    'ms_remaining', CASE
      WHEN s.plan_expires_at IS NULL THEN NULL
      WHEN s.plan_expires_at <= now() THEN 0
      ELSE EXTRACT(EPOCH FROM (s.plan_expires_at - now())) * 1000
    END
  ) INTO result
  FROM public.subscriptions s
  WHERE s.user_id = _user_id;
  
  RETURN COALESCE(result, '{"plan": "free"}'::jsonb);
END;
$$;
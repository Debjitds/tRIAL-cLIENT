-- ============================================
-- MONTHLY FREE QUOTA RESET SYSTEM FIX
-- Ensures quotas reset on 1st of every month
-- ============================================

-- Create a helper function to check and reset quotas inline
-- This is called during quota checks to ensure reset happens even without cron
CREATE OR REPLACE FUNCTION public.check_and_reset_user_quota(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _subscription record;
  _should_reset boolean := false;
BEGIN
  -- Get user's subscription
  SELECT * INTO _subscription 
  FROM public.subscriptions 
  WHERE user_id = _user_id
  FOR UPDATE; -- Lock the row to prevent race conditions
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if reset is needed (reset_at has passed)
  IF _subscription.reset_at <= now() THEN
    _should_reset := true;
    
    -- Reset quotas to hardcoded FREE plan limits
    -- These limits NEVER change based on subscription plan
    UPDATE public.subscriptions
    SET
      beginner_left = 3,      -- HARDCODED: Free = 3
      intermediate_left = 2,  -- HARDCODED: Free = 2
      veteran_left = 0,       -- HARDCODED: Free = 0 (always credits-only)
      reset_at = date_trunc('month', now()) + interval '1 month',
      updated_at = now()
    WHERE user_id = _user_id;
    
    -- Note: We do NOT touch credits, plan, or any other fields
  END IF;
  
  RETURN _should_reset;
END;
$$;

-- Update check_quota_availability to include inline reset check
CREATE OR REPLACE FUNCTION public.check_quota_availability(_user_id uuid, _level text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _subscription record;
  _free_left integer;
  _credit_cost integer;
  _was_reset boolean;
BEGIN
  -- CRITICAL: Check and reset quota if month boundary crossed
  _was_reset := public.check_and_reset_user_quota(_user_id);
  
  IF _was_reset THEN
    RAISE NOTICE 'Quota was reset for user %', _user_id;
  END IF;
  
  -- Get user subscription with all quota columns (now with fresh data if reset happened)
  SELECT * INTO _subscription FROM public.subscriptions WHERE user_id = _user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'status', 404, 'message', 'Subscription not found');
  END IF;
  
  -- Determine credit cost and free quota using static CASE (no dynamic SQL)
  CASE _level
    WHEN 'beginner' THEN 
      _credit_cost := 1; 
      _free_left := _subscription.beginner_left;
    WHEN 'intermediate' THEN 
      _credit_cost := 2; 
      _free_left := _subscription.intermediate_left;
    WHEN 'veteran' THEN 
      _credit_cost := 5; 
      _free_left := _subscription.veteran_left;
    ELSE 
      RETURN jsonb_build_object('ok', false, 'status', 400, 'message', 'Invalid level');
  END CASE;
  
  -- Veteran level check: must have paid plan
  IF _level = 'veteran' AND _subscription.plan = 'free' THEN
    RETURN jsonb_build_object('ok', false, 'status', 403, 'message', 'Veteran level requires a paid plan');
  END IF;
  
  -- Check if free quota available
  IF _free_left > 0 THEN
    RETURN jsonb_build_object(
      'ok', true, 
      'status', 200, 
      'message', 'Free quota available', 
      'credits_to_use', 0, 
      'use_free_quota', true,
      'quota_was_reset', _was_reset
    );
  END IF;
  
  -- No free quota, check credits
  IF _subscription.credits < _credit_cost THEN
    RETURN jsonb_build_object(
      'ok', false, 
      'status', 402, 
      'message', format('You have insufficient credit balance. Required: %s, Available: %s', _credit_cost, _subscription.credits)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'ok', true, 
    'status', 200, 
    'message', 'Credits available', 
    'credits_to_use', _credit_cost, 
    'use_free_quota', false,
    'quota_was_reset', _was_reset
  );
END;
$$;

-- Update consume_quota_after_success to include inline reset check
CREATE OR REPLACE FUNCTION public.consume_quota_after_success(_user_id uuid, _level text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _subscription record;
  _free_left integer;
  _credit_cost integer;
BEGIN
  -- CRITICAL: Check and reset quota if month boundary crossed
  -- This ensures even if user started generation before midnight, we're still consistent
  PERFORM public.check_and_reset_user_quota(_user_id);
  
  -- Get user subscription with all quota columns
  SELECT * INTO _subscription FROM public.subscriptions WHERE user_id = _user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Subscription not found');
  END IF;
  
  -- Determine credit cost and free quota using static CASE (no dynamic SQL)
  CASE _level
    WHEN 'beginner' THEN 
      _credit_cost := 1; 
      _free_left := _subscription.beginner_left;
    WHEN 'intermediate' THEN 
      _credit_cost := 2; 
      _free_left := _subscription.intermediate_left;
    WHEN 'veteran' THEN 
      _credit_cost := 5; 
      _free_left := _subscription.veteran_left;
    ELSE 
      RETURN jsonb_build_object('ok', false, 'message', 'Invalid level');
  END CASE;
  
  -- Check if free quota available - consume it first
  IF _free_left > 0 THEN
    -- Update the appropriate column using static SQL
    CASE _level
      WHEN 'beginner' THEN
        UPDATE public.subscriptions SET beginner_left = beginner_left - 1 WHERE user_id = _user_id;
      WHEN 'intermediate' THEN
        UPDATE public.subscriptions SET intermediate_left = intermediate_left - 1 WHERE user_id = _user_id;
      WHEN 'veteran' THEN
        UPDATE public.subscriptions SET veteran_left = veteran_left - 1 WHERE user_id = _user_id;
    END CASE;
    RETURN jsonb_build_object('ok', true, 'message', 'Free quota consumed', 'credits_used', 0);
  END IF;
  
  -- No free quota, deduct credits
  UPDATE public.subscriptions 
  SET credits = credits - _credit_cost 
  WHERE user_id = _user_id;
  
  RETURN jsonb_build_object('ok', true, 'message', 'Credits consumed', 'credits_used', _credit_cost);
END;
$$;

-- Update check_and_consume_quota to include inline reset check
CREATE OR REPLACE FUNCTION public.check_and_consume_quota(_user_id uuid, _level text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _subscription record;
  _free_left integer;
  _credit_cost integer;
BEGIN
  -- CRITICAL: Check and reset quota if month boundary crossed
  PERFORM public.check_and_reset_user_quota(_user_id);
  
  -- Get user subscription with all quota columns
  SELECT * INTO _subscription FROM public.subscriptions WHERE user_id = _user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'status', 404, 'message', 'Subscription not found');
  END IF;
  
  -- Determine credit cost and free quota using static CASE (no dynamic SQL)
  CASE _level
    WHEN 'beginner' THEN 
      _credit_cost := 1; 
      _free_left := _subscription.beginner_left;
    WHEN 'intermediate' THEN 
      _credit_cost := 2; 
      _free_left := _subscription.intermediate_left;
    WHEN 'veteran' THEN 
      _credit_cost := 5; 
      _free_left := _subscription.veteran_left;
    ELSE 
      RETURN jsonb_build_object('ok', false, 'status', 400, 'message', 'Invalid level');
  END CASE;
  
  -- Veteran level check: must have paid plan
  IF _level = 'veteran' AND _subscription.plan = 'free' THEN
    RETURN jsonb_build_object('ok', false, 'status', 403, 'message', 'Veteran level requires a paid plan');
  END IF;
  
  -- Check if free quota available
  IF _free_left > 0 THEN
    -- Consume free quota using static SQL
    CASE _level
      WHEN 'beginner' THEN
        UPDATE public.subscriptions SET beginner_left = beginner_left - 1 WHERE user_id = _user_id;
      WHEN 'intermediate' THEN
        UPDATE public.subscriptions SET intermediate_left = intermediate_left - 1 WHERE user_id = _user_id;
      WHEN 'veteran' THEN
        UPDATE public.subscriptions SET veteran_left = veteran_left - 1 WHERE user_id = _user_id;
    END CASE;
    RETURN jsonb_build_object('ok', true, 'status', 200, 'message', 'Free quota consumed', 'credits_used', 0);
  END IF;
  
  -- No free quota, check credits
  IF _subscription.credits < _credit_cost THEN
    RETURN jsonb_build_object(
      'ok', false, 
      'status', 402, 
      'message', format('You have insufficient credit balance. Required: %s, Available: %s', _credit_cost, _subscription.credits)
    );
  END IF;
  
  -- Deduct credits
  UPDATE public.subscriptions 
  SET credits = credits - _credit_cost 
  WHERE user_id = _user_id;
  
  RETURN jsonb_build_object('ok', true, 'status', 200, 'message', 'Credits consumed', 'credits_used', _credit_cost);
END;
$$;

-- Update reset_monthly_quotas to use hardcoded values
-- This is still used by cron but also for manual resets
CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Reset quotas for all users whose reset_at has passed
  -- HARDCODED limits that NEVER change regardless of plan
  UPDATE public.subscriptions
  SET
    beginner_left = 3,      -- HARDCODED: Always 3
    intermediate_left = 2,  -- HARDCODED: Always 2
    veteran_left = 0,       -- HARDCODED: Always 0 (credits-only)
    reset_at = date_trunc('month', now()) + interval '1 month',
    updated_at = now()
  WHERE reset_at <= now();
  -- Note: credits are NEVER touched during reset
END;
$$;

-- Revoke direct execution from users for the helper function
REVOKE EXECUTE ON FUNCTION public.check_and_reset_user_quota(uuid) FROM authenticated, public;
GRANT EXECUTE ON FUNCTION public.check_and_reset_user_quota(uuid) TO service_role;
-- ============================================================
-- SECURITY FIX: Revoke authenticated access to insert_credit_transaction
-- Only service_role should execute this function
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.insert_credit_transaction(uuid, text, integer, text, integer, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.insert_credit_transaction(uuid, text, integer, text, integer, jsonb) FROM public;

-- Ensure only service_role can execute
GRANT EXECUTE ON FUNCTION public.insert_credit_transaction(uuid, text, integer, text, integer, jsonb) TO service_role;

-- ============================================================
-- SECURITY FIX: Refactor quota functions to eliminate dynamic SQL
-- Replace EXECUTE format with static CASE statements
-- ============================================================

-- Fix check_quota_availability
CREATE OR REPLACE FUNCTION public.check_quota_availability(_user_id uuid, _level text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _subscription record;
  _free_left integer;
  _credit_cost integer;
BEGIN
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
    RETURN jsonb_build_object('ok', true, 'status', 200, 'message', 'Free quota available', 'credits_to_use', 0, 'use_free_quota', true);
  END IF;
  
  -- No free quota, check credits
  IF _subscription.credits < _credit_cost THEN
    RETURN jsonb_build_object(
      'ok', false, 
      'status', 402, 
      'message', format('You have insufficient credit balance. Required: %s, Available: %s', _credit_cost, _subscription.credits)
    );
  END IF;
  
  RETURN jsonb_build_object('ok', true, 'status', 200, 'message', 'Credits available', 'credits_to_use', _credit_cost, 'use_free_quota', false);
END;
$function$;

-- Fix consume_quota_after_success
CREATE OR REPLACE FUNCTION public.consume_quota_after_success(_user_id uuid, _level text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _subscription record;
  _free_left integer;
  _credit_cost integer;
BEGIN
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
$function$;

-- Also fix check_and_consume_quota which has the same pattern
CREATE OR REPLACE FUNCTION public.check_and_consume_quota(_user_id uuid, _level text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _subscription record;
  _free_left integer;
  _credit_cost integer;
BEGIN
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
$function$;
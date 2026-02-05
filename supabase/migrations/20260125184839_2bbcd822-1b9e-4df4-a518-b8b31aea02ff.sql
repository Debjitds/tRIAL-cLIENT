-- Ensure only one pending social request per user (partial unique index)
-- Drop first in case it already exists with different definition
DROP INDEX IF EXISTS public.social_reward_requests_one_pending_per_user;

CREATE UNIQUE INDEX social_reward_requests_one_pending_per_user
  ON public.social_reward_requests(user_id)
  WHERE status = 'pending';

-- Improve the trigger to provide clearer error messages
CREATE OR REPLACE FUNCTION public.enforce_social_reward_weekly_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _check_result jsonb;
BEGIN
  -- Check if user can submit
  _check_result := public.can_submit_social_reward(NEW.user_id);
  
  IF NOT (_check_result->>'allowed')::boolean THEN
    -- Provide specific error messages based on reason
    IF (_check_result->>'reason') = 'Cooldown active' THEN
      RAISE EXCEPTION 'You can submit a new social post after your 7-day cooldown ends on %', 
        (_check_result->>'cooldown_end')::timestamptz;
    ELSIF (_check_result->>'reason') = 'You have a pending request awaiting review' THEN
      RAISE EXCEPTION 'You already have a pending request. Please wait for admin review before submitting another.';
    ELSE
      RAISE EXCEPTION 'Social reward submission blocked: %', _check_result->>'reason';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
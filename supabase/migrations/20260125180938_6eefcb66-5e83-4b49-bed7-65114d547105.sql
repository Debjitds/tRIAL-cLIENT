-- Fix social reward resubmission: allow multiple historical requests per user
-- 1) Remove the legacy constraint that permanently limited users to a single request
ALTER TABLE public.social_reward_requests
  DROP CONSTRAINT IF EXISTS unique_user_submission;

-- 2) Keep "only one pending at a time" invariant (enforced additionally by trigger)
CREATE UNIQUE INDEX IF NOT EXISTS social_reward_requests_one_pending_per_user
  ON public.social_reward_requests(user_id)
  WHERE status = 'pending';

-- 3) Make weekly eligibility timestamp-accurate (no day-boundary rounding)
CREATE OR REPLACE FUNCTION public.can_submit_social_reward(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now timestamptz := now();
  _last_approved record;
  _pending_exists boolean;
  _cooldown_end timestamptz;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.social_reward_requests
    WHERE user_id = _user_id
      AND status = 'pending'
  ) INTO _pending_exists;

  SELECT reviewed_at
  INTO _last_approved
  FROM public.social_reward_requests
  WHERE user_id = _user_id
    AND status = 'approved'
    AND reviewed_at IS NOT NULL
  ORDER BY reviewed_at DESC
  LIMIT 1;

  IF _last_approved IS NULL THEN
    IF _pending_exists THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'You have a pending request awaiting review');
    END IF;
    RETURN jsonb_build_object('allowed', true, 'reason', 'No previous submissions');
  END IF;

  _cooldown_end := _last_approved.reviewed_at + interval '7 days';

  IF _now < _cooldown_end THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Cooldown active',
      'last_approved_at', _last_approved.reviewed_at,
      'cooldown_end', _cooldown_end
    );
  END IF;

  IF _pending_exists THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'You have a pending request awaiting review');
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'Eligible for new submission',
    'last_approved_at', _last_approved.reviewed_at,
    'cooldown_end', _cooldown_end
  );
END;
$$;
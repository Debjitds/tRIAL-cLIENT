-- Update check_ad_reward_eligibility to allow ALL users (including paid) to use ad rewards
CREATE OR REPLACE FUNCTION public.check_ad_reward_eligibility()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
    _subscription RECORD;
    _last_reward TIMESTAMPTZ;
    _today_count INTEGER;
    _cooldown_minutes INTEGER := 30;
    _daily_limit INTEGER := 3;
    _now TIMESTAMPTZ := now();
    _today_start TIMESTAMPTZ := date_trunc('day', _now);
    _cooldown_remaining INTEGER := 0;
    _is_paid BOOLEAN := false;
BEGIN
    _user_id := auth.uid();
    
    IF _user_id IS NULL THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'Not authenticated');
    END IF;
    
    -- Check subscription
    SELECT * INTO _subscription FROM public.subscriptions WHERE user_id = _user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'Subscription not found');
    END IF;
    
    -- Track if user is paid (but don't block them)
    IF _subscription.plan != 'free' THEN
        _is_paid := true;
    END IF;
    
    -- Get last successful reward time
    SELECT MAX(attempted_at) INTO _last_reward
    FROM public.ad_reward_attempts
    WHERE user_id = _user_id 
      AND rewarded = true
      AND attempted_at > _now - interval '24 hours';
    
    -- Check cooldown
    IF _last_reward IS NOT NULL AND (_now - _last_reward) < (_cooldown_minutes * interval '1 minute') THEN
        _cooldown_remaining := CEIL(EXTRACT(EPOCH FROM ((_last_reward + _cooldown_minutes * interval '1 minute') - _now)))::int;
    END IF;
    
    -- Count today's successful rewards
    SELECT COUNT(*) INTO _today_count
    FROM public.ad_reward_attempts
    WHERE user_id = _user_id 
      AND rewarded = true
      AND attempted_at >= _today_start;
    
    RETURN jsonb_build_object(
        'eligible', true,
        'is_paid', _is_paid,
        'daily_count', _today_count,
        'daily_limit', _daily_limit,
        'cooldown_remaining_seconds', _cooldown_remaining,
        'can_attempt', _today_count < _daily_limit AND _cooldown_remaining = 0
    );
END;
$$;
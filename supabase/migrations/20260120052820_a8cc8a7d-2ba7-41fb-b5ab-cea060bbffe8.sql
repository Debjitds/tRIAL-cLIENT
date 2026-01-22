
-- Create table for tracking ad reward attempts and grants
CREATE TABLE public.ad_reward_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    rewarded BOOLEAN NOT NULL DEFAULT false,
    credits_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_ad_reward_attempts_user_id ON public.ad_reward_attempts(user_id);
CREATE INDEX idx_ad_reward_attempts_attempted_at ON public.ad_reward_attempts(attempted_at);

-- Enable RLS
ALTER TABLE public.ad_reward_attempts ENABLE ROW LEVEL SECURITY;

-- Users can view their own ad reward attempts
CREATE POLICY "Users can view their own ad reward attempts"
ON public.ad_reward_attempts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all ad reward attempts
CREATE POLICY "Admins can view all ad reward attempts"
ON public.ad_reward_attempts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only system (via edge function) can insert - block direct inserts
CREATE POLICY "Block direct ad reward inserts"
ON public.ad_reward_attempts
FOR INSERT
WITH CHECK (false);

-- Create function to process ad reward attempt (server-side only)
CREATE OR REPLACE FUNCTION public.process_ad_reward_attempt(_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _subscription RECORD;
    _last_reward TIMESTAMPTZ;
    _today_count INTEGER;
    _cooldown_minutes INTEGER := 30; -- 30 minutes between attempts
    _daily_limit INTEGER := 3; -- Max 3 rewards per day
    _reward_credits INTEGER := 1; -- 1 credit per successful reward
    _can_reward BOOLEAN := false;
    _now TIMESTAMPTZ := now();
    _today_start TIMESTAMPTZ := date_trunc('day', _now);
BEGIN
    -- Verify user exists
    IF _user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Invalid user');
    END IF;
    
    -- Check subscription - only FREE users can claim ad rewards
    SELECT * INTO _subscription FROM public.subscriptions WHERE user_id = _user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Subscription not found');
    END IF;
    
    IF _subscription.plan != 'free' THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Ad rewards are only available for free plan users');
    END IF;
    
    -- Get last successful reward time
    SELECT MAX(attempted_at) INTO _last_reward
    FROM public.ad_reward_attempts
    WHERE user_id = _user_id 
      AND rewarded = true
      AND attempted_at > _now - interval '24 hours';
    
    -- Check cooldown (30 minutes since last reward)
    IF _last_reward IS NOT NULL AND (_now - _last_reward) < (_cooldown_minutes * interval '1 minute') THEN
        RETURN jsonb_build_object(
            'ok', false, 
            'message', format('Please wait %s minutes before trying again', 
                CEIL(EXTRACT(EPOCH FROM ((_last_reward + _cooldown_minutes * interval '1 minute') - _now)) / 60)::int),
            'cooldown_remaining_seconds', CEIL(EXTRACT(EPOCH FROM ((_last_reward + _cooldown_minutes * interval '1 minute') - _now)))::int
        );
    END IF;
    
    -- Count today's successful rewards
    SELECT COUNT(*) INTO _today_count
    FROM public.ad_reward_attempts
    WHERE user_id = _user_id 
      AND rewarded = true
      AND attempted_at >= _today_start;
    
    -- Check daily limit
    IF _today_count >= _daily_limit THEN
        RETURN jsonb_build_object(
            'ok', false, 
            'message', format('Daily reward limit reached (%s/%s). Try again tomorrow!', _today_count, _daily_limit),
            'daily_count', _today_count,
            'daily_limit', _daily_limit
        );
    END IF;
    
    -- Probabilistic reward (70% chance to reward - adds unpredictability)
    _can_reward := random() < 0.7;
    
    -- Record the attempt
    INSERT INTO public.ad_reward_attempts (user_id, attempted_at, rewarded, credits_awarded)
    VALUES (_user_id, _now, _can_reward, CASE WHEN _can_reward THEN _reward_credits ELSE 0 END);
    
    IF _can_reward THEN
        -- Award credits
        UPDATE public.subscriptions
        SET credits = credits + _reward_credits, updated_at = now()
        WHERE user_id = _user_id;
        
        RETURN jsonb_build_object(
            'ok', true, 
            'rewarded', true,
            'message', format('Thank you for your support! You earned %s credit.', _reward_credits),
            'credits_awarded', _reward_credits,
            'daily_count', _today_count + 1,
            'daily_limit', _daily_limit
        );
    ELSE
        RETURN jsonb_build_object(
            'ok', true, 
            'rewarded', false,
            'message', 'Thank you for supporting us! Rewards are not guaranteed per interaction.',
            'credits_awarded', 0,
            'daily_count', _today_count,
            'daily_limit', _daily_limit
        );
    END IF;
END;
$$;

-- Create function to check ad reward eligibility
CREATE OR REPLACE FUNCTION public.check_ad_reward_eligibility()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
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
    
    IF _subscription.plan != 'free' THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'Paid users do not see ads', 'is_paid', true);
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
        'is_paid', false,
        'daily_count', _today_count,
        'daily_limit', _daily_limit,
        'cooldown_remaining_seconds', _cooldown_remaining,
        'can_attempt', _today_count < _daily_limit AND _cooldown_remaining = 0
    );
END;
$$;

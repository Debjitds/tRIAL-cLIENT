-- Fix quota isolation: free quotas are always Beginner=3, Intermediate=2, Veteran=0 regardless of plan

-- 1) Align column defaults with the fixed free quota rules
ALTER TABLE public.subscriptions
  ALTER COLUMN beginner_left SET DEFAULT 3,
  ALTER COLUMN intermediate_left SET DEFAULT 2,
  ALTER COLUMN veteran_left SET DEFAULT 0;

-- 2) Clamp any existing misconfigured quota counters back to the fixed limits
--    (keeps already-consumed state when below limit, removes accidental extra free quota when above)
UPDATE public.subscriptions
SET
  beginner_left = CASE
    WHEN beginner_left IS NULL OR beginner_left < 0 THEN 3
    WHEN beginner_left > 3 THEN 3
    ELSE beginner_left
  END,
  intermediate_left = CASE
    WHEN intermediate_left IS NULL OR intermediate_left < 0 THEN 2
    WHEN intermediate_left > 2 THEN 2
    ELSE intermediate_left
  END,
  veteran_left = CASE
    WHEN veteran_left IS NULL OR veteran_left < 0 THEN 0
    WHEN veteran_left > 0 THEN 0
    ELSE veteran_left
  END;

-- 3) Monthly reset must NOT depend on plan; it restores the fixed free quota amounts only
CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.subscriptions
  SET
    beginner_left = 3,
    intermediate_left = 2,
    veteran_left = 0,
    reset_at = date_trunc('month', now()) + interval '1 month',
    updated_at = now()
  WHERE reset_at <= now();
END;
$function$;
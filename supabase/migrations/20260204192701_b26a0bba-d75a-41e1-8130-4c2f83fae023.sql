-- 1) Backfill expiry timestamps for existing paid plans
UPDATE public.subscriptions
SET
  plan_started_at = COALESCE(plan_started_at, updated_at),
  plan_expires_at = COALESCE(plan_expires_at, COALESCE(plan_started_at, updated_at) + INTERVAL '30 days')
WHERE plan IN ('pro', 'proplus')
  AND (plan_started_at IS NULL OR plan_expires_at IS NULL);

-- 2) Immediately enforce expiry after backfill (preserves credits)
SELECT public.check_and_expire_plans();

-- 3) Try to enable pg_cron + schedule hourly enforcement (no-op if not available)
DO $$
BEGIN
  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'pg_cron extension cannot be created (insufficient_privilege). Skipping scheduling.';
      RETURN;
    WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron extension creation failed: % (skipping scheduling)', SQLERRM;
      RETURN;
  END;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'expire-pro-plans-hourly'
    ) THEN
      PERFORM cron.schedule(
        'expire-pro-plans-hourly',
        '0 * * * *',
        'SELECT public.check_and_expire_plans();'
      );
    END IF;
  END IF;
END;
$$;

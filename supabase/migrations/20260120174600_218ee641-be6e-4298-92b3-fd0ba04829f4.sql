
-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Allow public read of maintenance mode setting" ON public.system_settings;

-- Create a more restrictive policy that only allows authenticated admins to read full data
-- Public users should use the system_settings_public view instead
CREATE POLICY "Only admins can read system settings directly"
ON public.system_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create a security definer function for public maintenance mode check
-- This function only returns the necessary data without exposing sensitive fields
CREATE OR REPLACE FUNCTION public.get_maintenance_mode()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'enabled', (value->>'enabled')::boolean,
    'message', value->>'message'
  )
  FROM public.system_settings
  WHERE key = 'maintenance_mode'
  LIMIT 1;
$$;

-- Grant execute on the function to public
GRANT EXECUTE ON FUNCTION public.get_maintenance_mode() TO anon, authenticated;

-- Update the is_maintenance_mode function to use the secure approach
CREATE OR REPLACE FUNCTION public.is_maintenance_mode()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((value->>'enabled')::boolean, false)
  FROM public.system_settings
  WHERE key = 'maintenance_mode'
  LIMIT 1;
$$;

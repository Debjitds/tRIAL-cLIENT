
-- Fix Issue 1: Ensure profiles RLS is properly restrictive
-- The current policies are actually correct, but let's add an extra safety by ensuring
-- the "public" role policies only apply to authenticated users for SELECT
-- First, drop the overly broad policy and recreate with proper role restriction

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING ((auth.uid() = user_id) AND (NOT is_maintenance_mode()));

-- Fix Issue 2: Fix system_settings_public view to use security_invoker
-- and add RLS policy on system_settings to allow public read of specific non-sensitive keys only

-- Drop the existing view
DROP VIEW IF EXISTS public.system_settings_public;

-- Create a new view with security_invoker to respect RLS
CREATE VIEW public.system_settings_public
WITH (security_invoker = on) AS
  SELECT 
    id,
    key,
    value,
    updated_at
  FROM public.system_settings
  WHERE key = 'maintenance_mode'; -- Only expose maintenance mode setting publicly

-- Add a SELECT policy on system_settings for authenticated users to see maintenance mode
-- (We need to allow SELECT for the view to work)
CREATE POLICY "Allow public read of maintenance mode setting"
ON public.system_settings
FOR SELECT
USING (key = 'maintenance_mode');

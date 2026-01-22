-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Service role can insert credit transactions" ON public.credit_transactions;

-- Create a SECURITY DEFINER function to safely insert credit transactions
-- This ensures only validated inserts from edge functions can occur
CREATE OR REPLACE FUNCTION public.insert_credit_transaction(
  _user_id uuid,
  _type text,
  _amount integer,
  _description text,
  _balance_after integer,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_id uuid;
BEGIN
  -- Validate required fields
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;
  
  IF _type IS NULL OR _type = '' THEN
    RAISE EXCEPTION 'type is required';
  END IF;
  
  IF _amount IS NULL THEN
    RAISE EXCEPTION 'amount is required';
  END IF;
  
  IF _description IS NULL OR _description = '' THEN
    RAISE EXCEPTION 'description is required';
  END IF;
  
  -- Validate type is one of the allowed values
  IF _type NOT IN ('purchase', 'usage', 'bonus', 'refund', 'referral', 'ad_reward', 'social_reward', 'adjustment') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', _type;
  END IF;
  
  -- Insert the transaction
  INSERT INTO public.credit_transactions (
    user_id,
    type,
    amount,
    description,
    balance_after,
    metadata
  ) VALUES (
    _user_id,
    _type,
    _amount,
    _description,
    _balance_after,
    COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO _new_id;
  
  RETURN _new_id;
END;
$$;

-- Grant execute to authenticated users (function validates internally)
GRANT EXECUTE ON FUNCTION public.insert_credit_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_credit_transaction TO service_role;
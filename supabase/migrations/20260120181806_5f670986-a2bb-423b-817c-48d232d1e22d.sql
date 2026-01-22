-- Revoke EXECUTE permission from authenticated users on insert_credit_transaction
-- This function should ONLY be callable via service_role (edge functions)
REVOKE EXECUTE ON FUNCTION public.insert_credit_transaction FROM authenticated;

-- Ensure only service_role can execute this function
GRANT EXECUTE ON FUNCTION public.insert_credit_transaction TO service_role;
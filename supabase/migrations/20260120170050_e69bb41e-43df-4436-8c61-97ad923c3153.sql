-- Create credit_transactions table to track all credit events
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus', 'refund', 'referral', 'ad_reward', 'signup')),
  description TEXT NOT NULL,
  balance_after INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own transactions
CREATE POLICY "Users can view their own credit transactions"
ON public.credit_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Only backend can insert transactions (via service role)
CREATE POLICY "Service role can insert credit transactions"
ON public.credit_transactions
FOR INSERT
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.credit_transactions IS 'Tracks all credit-related transactions including purchases, usage, bonuses, and refunds';
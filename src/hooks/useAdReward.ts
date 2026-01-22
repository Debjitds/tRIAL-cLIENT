import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AdRewardEligibility {
  eligible: boolean;
  is_paid: boolean;
  daily_count: number;
  daily_limit: number;
  cooldown_remaining_seconds: number;
  can_attempt: boolean;
  reason?: string;
}

interface AdRewardResult {
  ok: boolean;
  rewarded?: boolean;
  message: string;
  credits_awarded?: number;
  daily_count?: number;
  daily_limit?: number;
  cooldown_remaining_seconds?: number;
}

export function useAdReward() {
  const { user } = useAuth();
  const [eligibility, setEligibility] = useState<AdRewardEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const checkEligibility = useCallback(async () => {
    if (!user) {
      setEligibility(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('check_ad_reward_eligibility');

      if (error) {
        console.error('Error checking ad reward eligibility:', error);
        setEligibility(null);
      } else if (data) {
        setEligibility(data as unknown as AdRewardEligibility);
      }
    } catch (err) {
      console.error('Error in eligibility check:', err);
      setEligibility(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  // Auto-refresh cooldown
  useEffect(() => {
    if (!eligibility || eligibility.cooldown_remaining_seconds <= 0) return;

    const interval = setInterval(() => {
      checkEligibility();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [eligibility, checkEligibility]);

  const processReward = useCallback(async (): Promise<AdRewardResult | null> => {
    if (!user || processing) return null;

    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please sign in to continue');
        return null;
      }

      const response = await fetch(
        `https://avsuyudchzyoyakxotfm.supabase.co/functions/v1/process-ad-reward`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Failed to process reward');
        return null;
      }

      // Refresh eligibility after processing
      await checkEligibility();

      return result as AdRewardResult;
    } catch (err) {
      console.error('Error processing ad reward:', err);
      toast.error('Failed to process reward. Please try again.');
      return null;
    } finally {
      setProcessing(false);
    }
  }, [user, processing, checkEligibility]);

  return {
    eligibility,
    loading,
    processing,
    checkEligibility,
    processReward,
    // Convenience getters
    isEligible: eligibility?.eligible ?? false,
    isPaidUser: eligibility?.is_paid ?? false,
    canAttempt: eligibility?.can_attempt ?? false,
    dailyCount: eligibility?.daily_count ?? 0,
    dailyLimit: eligibility?.daily_limit ?? 3,
    cooldownSeconds: eligibility?.cooldown_remaining_seconds ?? 0,
  };
}

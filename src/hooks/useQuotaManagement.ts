import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PlanType = 'free' | 'pro' | 'proplus';
export type LevelType = 'beginner' | 'intermediate' | 'veteran';

interface QuotaData {
  plan: PlanType;
  credits: number;
  quotas: {
    beginnerLeft: number;
    intermediateLeft: number;
    veteranLeft: number;
    resetAt: string;
  };
  // Plan expiry tracking
  planStartedAt: string | null;
  planExpiresAt: string | null;
  isPlanExpired: boolean;
}

// Credit costs per level (updated: veteran = 5)
export const CREDIT_COSTS: Record<LevelType, number> = {
  beginner: 1,
  intermediate: 2,
  veteran: 5
};

// HARDCODED free monthly quotas - NEVER change based on plan
// These are the same for ALL users (Free, Pro, ProPlus)
// Pro plan only provides credits and feature access, NOT increased free quotas
const HARDCODED_FREE_QUOTAS = {
  beginner: 3,      // Always 3 free per month
  intermediate: 2,  // Always 2 free per month
  veteran: 0        // Always 0 free (credits-only)
};

export const useQuotaManagement = () => {
  const [quotaData, setQuotaData] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSubscription = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, plan_started_at, plan_expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If subscription doesn't exist, this is a critical error
      // Subscriptions should be created by the handle_new_user trigger on signup
      // Users should never be in a state without a subscription
      if (!data) {
        console.error('Critical: User has no subscription record. This should have been created on signup.');
        toast({
          title: 'Account Setup Issue',
          description: 'Your subscription data is missing. Please contact support.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }
      
      // Subscription exists, use it
      // Calculate if plan is expired based on backend timestamp
      const planExpiresAt = data.plan_expires_at;
      const isPlanExpired = planExpiresAt ? new Date(planExpiresAt) <= new Date() : false;
      
      setQuotaData({
        plan: data.plan as PlanType,
        credits: data.credits ?? 0,
        quotas: {
          beginnerLeft: data.beginner_left,
          intermediateLeft: data.intermediate_left,
          veteranLeft: data.veteran_left,
          resetAt: data.reset_at
        },
        planStartedAt: data.plan_started_at || null,
        planExpiresAt: planExpiresAt || null,
        isPlanExpired
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching subscription:', error);
      }
      toast({
        title: 'Error',
        description: 'Failed to load subscription data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const getQuotaStatus = (level: LevelType): {
    available: boolean;
    remaining: number | 'locked';
    limit: number | 'locked';
    isLocked: boolean;
    creditCost: number;
    canUseCredits: boolean;
  } => {
    if (!quotaData) {
      return { available: false, remaining: 0, limit: 0, isLocked: false, creditCost: 0, canUseCredits: false };
    }

    const creditCost = CREDIT_COSTS[level];
    
    // Veteran level is locked for free plan users
    if (level === 'veteran' && quotaData.plan === 'free') {
      return { 
        available: false, 
        remaining: 'locked', 
        limit: 'locked', 
        isLocked: true,
        creditCost,
        canUseCredits: false
      };
    }

    // CRITICAL: Use HARDCODED free quota limits
    // These limits NEVER change regardless of subscription plan
    // Pro plan provides credits and access, NOT increased free quotas
    const limit = HARDCODED_FREE_QUOTAS[level];

    const remaining = quotaData.quotas[`${level}Left` as keyof typeof quotaData.quotas] as number;
    const canUseCredits = quotaData.credits >= creditCost;
    
    // Available if has free quota OR has enough credits
    const available = remaining > 0 || canUseCredits;
    
    return {
      available,
      remaining,
      limit,
      isLocked: false,
      creditCost,
      canUseCredits
    };
  };

  const getResetDate = (): Date | null => {
    if (!quotaData) return null;
    return new Date(quotaData.quotas.resetAt);
  };

  // Note: Quota consumption is handled server-side only via Edge Functions
  // This prevents privilege escalation and ensures secure credit management

  return {
    quotaData,
    loading,
    getQuotaStatus,
    getResetDate,
    refresh: fetchSubscription
  };
};

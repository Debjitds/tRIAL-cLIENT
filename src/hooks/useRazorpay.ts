import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { triggerConfetti } from '@/lib/confetti';

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    email: string;
    name: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
      close: () => void;
    };
  }
}

type PlanType = 'pro' | 'proplus';

const PLAN_AMOUNTS: Record<PlanType, number> = {
  pro: 50000, // ₹500 in paise
  proplus: 100000, // ₹1000 in paise
};

const PLAN_NAMES: Record<PlanType, string> = {
  pro: 'Pro Plan',
  proplus: 'Pro Plus Plan',
};

export function useRazorpay() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const createOrder = useCallback(async (plan: PlanType) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Please sign in to continue');
    }

    const response = await fetch(
      `https://avsuyudchzyoyakxotfm.supabase.co/functions/v1/create-razorpay-order`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan,
          amount: PLAN_AMOUNTS[plan],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create order');
    }

    return response.json();
  }, []);

  const verifyPayment = useCallback(async (
    paymentData: RazorpayResponse,
    plan: PlanType
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Session expired. Please sign in again.');
    }

    const response = await fetch(
      `https://avsuyudchzyoyakxotfm.supabase.co/functions/v1/verify-razorpay-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...paymentData,
          plan,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Payment verification failed');
    }

    return response.json();
  }, []);

  const initiatePayment = useCallback(async (
    plan: PlanType,
    onSuccess?: () => void
  ) => {
    if (!user) {
      toast.error('Please sign in to upgrade');
      return;
    }

    setLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create order
      const orderData = await createOrder(plan);

      // Initialize Razorpay
      const options: RazorpayOptions = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'tRIAL - cLIENTS',
        description: PLAN_NAMES[plan],
        order_id: orderData.order_id,
        handler: async (response) => {
          setVerifying(true);
          try {
            const result = await verifyPayment(response, plan);
            const creditsAdded = result.credits_added || 0;
            if (creditsAdded > 0) {
              // Trigger confetti celebration!
              triggerConfetti();
              toast.success(`+${creditsAdded} credits added to your account!`, {
                description: `Successfully upgraded to ${PLAN_NAMES[plan]}`,
              });
            } else {
              toast.success(`Successfully upgraded to ${PLAN_NAMES[plan]}!`);
            }
            onSuccess?.();
          } catch (err: any) {
            console.error('Payment verification error:', err);
            toast.error(err.message || 'Payment verification failed');
          } finally {
            setVerifying(false);
          }
        },
        prefill: {
          email: user.email || '',
          name: user.user_metadata?.display_name || user.user_metadata?.full_name || '',
        },
        theme: {
          color: '#6366f1', // Primary color
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast.info('Payment cancelled');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      console.error('Payment initiation error:', err);
      toast.error(err.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  }, [user, loadRazorpayScript, createOrder, verifyPayment]);

  return {
    initiatePayment,
    loading,
    verifying,
  };
}

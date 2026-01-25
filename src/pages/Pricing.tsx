import { Check, ArrowLeft, X, Zap, Crown, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for trying out',
    icon: Zap,
    features: [
      '3 project generation/month (Beginner Level)',
      '2 project generation/month (Intermediate Level)',
      'Email Support',
      '5 free joining credits (One Time Only)'
    ],
    cta: 'Current Plan',
    highlighted: false,
    isContact: false
  },
  {
    name: 'Pro',
    price: '$5',
    description: 'For serious ones',
    icon: Crown,
    features: [
      'Access all project levels',
      '15 credits per month',
      'Priority Support',
      'Everything in Free'
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
    isContact: false
  },
  {
    name: 'Contact',
    price: 'Custom',
    description: 'For Professionals',
    icon: Mail,
    features: [
      'Unlimited project generations',
      'Custom credit packages',
      'Dedicated account manager',
      'Custom integrations',
      'White-label solutions',
      'SLA guarantees'
    ],
    cta: 'Contact Us',
    highlighted: false,
    isContact: true
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { initiatePayment, loading: paymentLoading, verifying } = useRazorpay();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [downgrading, setDowngrading] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) {
        setLoadingPlan(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setCurrentPlan(data?.plan || 'free');
      } catch (err) {
        console.error('Error fetching plan:', err);
      } finally {
        setLoadingPlan(false);
      }
    };

    fetchPlan();
  }, [user]);

  const handleDowngrade = async () => {
    if (!user) return;
    setDowngrading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `https://avsuyudchzyoyakxotfm.supabase.co/functions/v1/downgrade-to-free`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success('Downgraded to Free plan');
      setCurrentPlan('free');
      setShowDowngradeDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to downgrade');
    } finally {
      setDowngrading(false);
    }
  };

  const handleUpgrade = async (planName: string) => {
    if (!user) {
      toast.error('Please sign in to upgrade');
      navigate('/auth');
      return;
    }

    if (planName === 'Free') {
      if (currentPlan === 'free') {
        toast.info('You are already on the Free plan');
      } else {
        setShowDowngradeDialog(true);
      }
      return;
    }

    if (planName === 'Pro') {
      await initiatePayment('pro', () => {
        setCurrentPlan('pro');
        navigate('/dashboard');
      });
    }
  };

  const getButtonText = (planName: string) => {
    if (loadingPlan) return 'Loading...';

    if (planName === 'Free') {
      return currentPlan === 'free' ? 'Current Plan' : 'Downgrade';
    }

    if (planName === 'Pro') {
      if (currentPlan === 'pro' || currentPlan === 'proplus') {
        return 'Current Plan';
      }
      return 'Upgrade to Pro';
    }

    return 'Contact Us';
  };

  const isButtonDisabled = (planName: string) => {
    if (loadingPlan || paymentLoading || verifying) return true;
    if (planName === 'Free' && currentPlan === 'free') return true;
    if (planName === 'Pro' && (currentPlan === 'pro' || currentPlan === 'proplus')) return true;
    if (planName === 'Contact') return false;
    return false;
  };

  return (
    <div className="min-h-screen py-6 sm:py-12 lg:py-20">
      <div className="container mx-auto px-4">
        {/* Close/Back buttons */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 max-w-6xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="gap-2 text-xs sm:text-sm"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that's right for you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex"
            >
              <Card className={`glass-card flex flex-col w-full relative ${plan.highlighted
                  ? 'border-primary shadow-glow ring-2 ring-primary/20'
                  : 'border-border/30'
                }`}>
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4 pt-6 sm:pt-8">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 rounded-xl flex items-center justify-center ${plan.highlighted ? 'bg-gradient-primary' : 'bg-muted'
                    }`}>
                    <plan.icon className={`h-6 w-6 sm:h-7 sm:w-7 ${plan.highlighted ? 'text-primary-foreground' : 'text-foreground'
                      }`} />
                  </div>

                  <CardTitle className="text-xl sm:text-2xl text-foreground">{plan.name}</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">{plan.description}</CardDescription>
                  <div className="mt-3 sm:mt-4">
                    <span className="text-3xl sm:text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  {plan.isContact ? (
                    <Button
                      className="w-full mb-4 sm:mb-6"
                      variant="outline"
                      asChild
                    >
                      <a href="mailto:help.trialclients@gmail.com" className="flex items-center justify-center gap-2">
                        <Mail className="h-4 w-4" />
                        {plan.cta}
                      </a>
                    </Button>
                  ) : (
                    <Button
                      className={`w-full mb-4 sm:mb-6 ${plan.highlighted
                          ? 'bg-gradient-primary hover:opacity-90'
                          : ''
                        }`}
                      variant={plan.highlighted ? 'default' : 'outline'}
                      disabled={isButtonDisabled(plan.name)}
                      onClick={() => handleUpgrade(plan.name)}
                    >
                      {(paymentLoading || verifying) && plan.name === 'Pro' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {verifying ? 'Verifying...' : 'Processing...'}
                        </>
                      ) : (
                        getButtonText(plan.name)
                      )}
                    </Button>
                  )}

                  <ul className="space-y-2 sm:space-y-3 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <Check className="h-4 w-4 sm:h-5 sm:w-5 text-accent mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-foreground text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>


        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm sm:text-base">
            All plans include 14-day money-back guarantee • No credit card required for free plan
          </p>
        </div>
      </div>

      {/* Downgrade Confirmation Dialog */}
      <AlertDialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Downgrade to Free Plan?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to downgrade to the Free plan?</p>
              <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                <li>You will lose access to Pro features immediately</li>
                <li>Veteran level projects will be locked</li>
                <li>Your purchased credits will remain usable</li>
                <li>No refunds will be provided</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={downgrading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDowngrade} disabled={downgrading} className="bg-destructive hover:bg-destructive/90">
              {downgrading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
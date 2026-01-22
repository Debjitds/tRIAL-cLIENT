import { useState } from 'react';
import { Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdReward } from '@/hooks/useAdReward';
import { toast } from 'sonner';

// Sponsor URL - can be changed to actual sponsor content
const SPONSOR_URL = 'https://www.google.com/search?q=sponsor+content';

export function AdRewardButton() {
  const {
    loading,
    processing,
    isPaidUser,
    canAttempt,
    dailyCount,
    dailyLimit,
    cooldownSeconds,
    processReward,
  } = useAdReward();
  
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [wasRewarded, setWasRewarded] = useState(false);

  // Video button is now available for all users, regardless of paid status

  const formatCooldown = (seconds: number) => {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const handleClick = () => {
    if (!canAttempt) {
      if (dailyCount >= dailyLimit) {
        toast.info(`Daily limit reached (${dailyCount}/${dailyLimit}). Try again tomorrow!`);
      } else if (cooldownSeconds > 0) {
        toast.info(`Please wait ${formatCooldown(cooldownSeconds)} before trying again.`);
      }
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setShowConfirmation(false);
    
    // Open sponsor content in new tab
    window.open(SPONSOR_URL, '_blank', 'noopener,noreferrer');
    
    // Small delay to simulate viewing sponsor content
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Process the reward
    const result = await processReward();
    
    if (result) {
      setWasRewarded(result.rewarded ?? false);
      setResultMessage(result.message);
      setShowResult(true);
    }
  };

  const tooltipText = canAttempt 
    ? `Support us by viewing sponsor content and earn limited credits.\nRewards are optional and not guaranteed per interaction.\n(${dailyCount}/${dailyLimit} today)`
    : dailyCount >= dailyLimit 
      ? `Daily limit reached (${dailyCount}/${dailyLimit}). Try again tomorrow!`
      : `Cooldown active. Try again in ${formatCooldown(cooldownSeconds)}.`;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 ${!canAttempt && !loading ? 'opacity-50' : ''}`}
              onClick={handleClick}
              disabled={processing || loading}
            >
              {processing || loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              ) : (
                <Video className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            className="max-w-[250px] text-center whitespace-pre-line"
          >
            <p className="text-xs">{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Support Us</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Thank you for supporting tRIAL - cLIENTS! You'll be redirected to our sponsor's content.
              </p>
              <p className="text-xs text-muted-foreground italic">
                Note: Rewards are not guaranteed per interaction. Credits may be awarded based on various factors.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Continue to Sponsor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Result Dialog */}
      <AlertDialog open={showResult} onOpenChange={setShowResult}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {wasRewarded ? '🎉 Thank You!' : 'Thank You!'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {resultMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowResult(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

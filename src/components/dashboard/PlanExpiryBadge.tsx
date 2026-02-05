import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, XCircle } from 'lucide-react';

interface PlanExpiryBadgeProps {
  plan: string;
  expiresAt: string | null;
  className?: string;
  showIcon?: boolean;
}

/**
 * Displays plan expiry countdown based on backend timestamp.
 * - Shows nothing for free users or if no expiry date exists
 * - Shows countdown for active Pro plans
 * - Shows expired message when plan has expired
 */
const PlanExpiryBadge = ({ plan, expiresAt, className = '', showIcon = true }: PlanExpiryBadgeProps) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (!expiresAt || plan === 'free') {
      setTimeRemaining('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiryTime = new Date(expiresAt).getTime();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining('Your Pro plan has expired');
        return;
      }

      setIsExpired(false);

      // Calculate time remaining
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      // Set warning state if less than 7 days
      setIsWarning(days < 7);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    // Update immediately and then every minute
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [expiresAt, plan]);

  // Don't render for free users or if no expiry
  if (!expiresAt || plan === 'free') {
    return null;
  }

  // Determine styling based on state
  const getVariantStyles = () => {
    if (isExpired) {
      return 'bg-destructive/10 text-destructive border-destructive/30';
    }
    if (isWarning) {
      return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
    }
    return 'bg-muted text-muted-foreground border-border/30';
  };

  const getIcon = () => {
    if (isExpired) {
      return <XCircle className="h-3 w-3" />;
    }
    if (isWarning) {
      return <AlertTriangle className="h-3 w-3" />;
    }
    return <Clock className="h-3 w-3" />;
  };

  return (
    <Badge 
      variant="outline" 
      className={`text-xs px-2 py-0.5 gap-1 ${getVariantStyles()} ${className}`}
    >
      {showIcon && getIcon()}
      {timeRemaining}
    </Badge>
  );
};

export default PlanExpiryBadge;

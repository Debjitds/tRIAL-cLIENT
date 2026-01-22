import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  showLabel?: boolean;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'gradient' | 'exhausted';
  /** When true, 100% means exhausted (negative), not complete (positive) */
  isExhaustedState?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, showLabel = false, label, variant = 'default', isExhaustedState = false, ...props }, ref) => {
  // Clamp value between 0 and 100 to prevent overflow
  const clampedValue = Math.max(0, Math.min(100, value || 0));
  const isFullyUsed = clampedValue >= 100;
  
  const variantStyles = {
    default: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    gradient: 'bg-gradient-primary',
    exhausted: 'bg-destructive'
  };

  // Determine which variant to use - if exhausted state and fully used, use exhausted style
  const effectiveVariant = isExhaustedState && isFullyUsed ? 'exhausted' : variant;

  return (
    <div className="w-full space-y-2">
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground" aria-live="polite">
            {label || 'Progress'}
          </span>
          <span className="text-foreground font-medium">
            {isFullyUsed && isExhaustedState ? (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" />
                Exhausted
              </span>
            ) : (
              `${Math.round(clampedValue)}%`
            )}
          </span>
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative h-3 w-full overflow-hidden rounded-full bg-muted/30 backdrop-blur-sm border border-border/20",
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 transition-all duration-500 ease-out rounded-full",
            variantStyles[effectiveVariant]
          )}
          style={{ 
            transform: `translateX(-${100 - clampedValue}%)`,
            boxShadow: clampedValue > 0 ? `0 0 12px hsl(var(--${effectiveVariant === 'exhausted' ? 'destructive' : 'primary'}) / 0.4)` : 'none'
          }}
        />
        {/* Shimmer effect for indeterminate state */}
        {value === undefined && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" 
               style={{ backgroundSize: '200% 100%' }} 
          />
        )}
      </ProgressPrimitive.Root>
    </div>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };

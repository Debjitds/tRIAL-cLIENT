import confetti from 'canvas-confetti';

/**
 * Triggers a celebration confetti effect
 * Used for successful credit purchases
 */
export const triggerConfetti = () => {
  // First burst
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });

  // Second burst with slight delay
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
  }, 200);

  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });
  }, 400);
};

/**
 * Triggers a subtle celebration for smaller wins
 */
export const triggerSmallConfetti = () => {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 },
    colors: ['#6366f1', '#8b5cf6', '#a855f7']
  });
};

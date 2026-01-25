import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Package, Zap, Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCreditPurchase } from '@/hooks/useCreditPurchase';

interface CreditPackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export type CreditPackType = 'mini' | 'standard' | 'power';

export const CREDIT_PACKS: Record<CreditPackType, { credits: number; price: string; priceInPaise: number; popular?: boolean }> = {
  mini: { credits: 10, price: '$3', priceInPaise: 25000 }, // ₹250 in paise
  standard: { credits: 15, price: '$5', priceInPaise: 42000, popular: true }, // ₹420 in paise
  power: { credits: 20, price: '$8', priceInPaise: 67000 }, // ₹670 in paise
};

export function CreditPackModal({ open, onOpenChange, onSuccess }: CreditPackModalProps) {
  const [selectedPack, setSelectedPack] = useState<CreditPackType | null>(null);
  const { purchaseCreditPack, loading, verifying } = useCreditPurchase();

  const handlePurchase = async (packType: CreditPackType) => {
    setSelectedPack(packType);
    await purchaseCreditPack(packType, () => {
      onOpenChange(false);
      onSuccess?.();
    });
    setSelectedPack(null);
  };

  const isProcessing = loading || verifying;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Coins className="h-5 w-5 text-primary" />
            Buy Credit Packs
          </DialogTitle>
          <DialogDescription>
            Purchase additional credits anytime. Credits never expire.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 mt-4">
          {(Object.entries(CREDIT_PACKS) as [CreditPackType, typeof CREDIT_PACKS['mini']][]).map(([type, pack]) => (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: type === 'mini' ? 0 : type === 'standard' ? 0.1 : 0.2 }}
            >
              <Card
                className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${
                  pack.popular ? 'border-primary ring-1 ring-primary/20' : 'border-border/50'
                } ${selectedPack === type && isProcessing ? 'opacity-50' : ''}`}
                onClick={() => !isProcessing && handlePurchase(type)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      type === 'mini' ? 'bg-emerald-500/20' :
                      type === 'standard' ? 'bg-primary/20' :
                      'bg-orange-500/20'
                    }`}>
                      {type === 'mini' ? <Coins className="h-5 w-5 text-emerald-400" /> :
                       type === 'standard' ? <Package className="h-5 w-5 text-primary" /> :
                       <Zap className="h-5 w-5 text-orange-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold capitalize">{type} Pack</span>
                        {pack.popular && (
                          <Badge className="bg-primary/20 text-primary text-xs">Popular</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{pack.credits} credits</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold">{pack.price}</span>
                    <Button
                      size="sm"
                      disabled={isProcessing}
                      variant={pack.popular ? 'default' : 'outline'}
                      className={pack.popular ? 'bg-gradient-primary' : ''}
                    >
                      {selectedPack === type && isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Credits are added instantly • No subscription required • Credits never expire
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

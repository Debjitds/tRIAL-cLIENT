import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, CheckCircle, XCircle, Clock, Coins } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface AdRewardAttempt {
  id: string;
  attempted_at: string;
  rewarded: boolean;
  credits_awarded: number | null;
}

export function AdRewardHistory() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<AdRewardAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttempts = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('ad_reward_attempts')
        .select('id, attempted_at, rewarded, credits_awarded')
        .eq('user_id', user.id)
        .order('attempted_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAttempts(data || []);
    } catch (error) {
      console.error('Error fetching ad reward history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchAttempts();
    }
  }, [user?.id]);

  // Real-time subscription for auto-refresh
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('ad-reward-history')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ad_reward_attempts',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchAttempts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalEarned = attempts.reduce((sum, a) => sum + (a.credits_awarded || 0), 0);
  const successRate = attempts.length > 0 
    ? Math.round((attempts.filter(a => a.rewarded).length / attempts.length) * 100) 
    : 0;

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-4 w-4 text-primary" />
          Reward Ad History
        </CardTitle>
        <CardDescription className="text-sm">
          Your recent ad reward attempts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {attempts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No ad rewards yet</p>
            <p className="text-xs">Watch ads to earn credits</p>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <Coins className="h-4 w-4 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold text-primary">+{totalEarned}</p>
                <p className="text-xs text-muted-foreground">Credits Earned</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <CheckCircle className="h-4 w-4 mx-auto mb-1 text-emerald-400" />
                <p className="text-lg font-bold">{successRate}%</p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>

            {/* History List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {attempt.rewarded ? (
                      <div className="p-1.5 rounded-full bg-emerald-500/20">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-full bg-muted">
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {attempt.rewarded ? 'Reward Earned' : 'No Reward'}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(attempt.attempted_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  {attempt.rewarded && attempt.credits_awarded && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                      +{attempt.credits_awarded}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Gift,
  CreditCard,
  Users,
  PlayCircle,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowLeft,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'bonus' | 'refund' | 'referral' | 'ad_reward' | 'signup';
  description: string;
  balance_after: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

const typeConfig: Record<string, { icon: typeof ArrowUpCircle; color: string; bgColor: string }> = {
  purchase: { icon: CreditCard, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  usage: { icon: ArrowDownCircle, color: 'text-red-400', bgColor: 'bg-red-500/10' },
  bonus: { icon: Gift, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  refund: { icon: RefreshCw, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  referral: { icon: Users, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  ad_reward: { icon: PlayCircle, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  signup: { icon: Sparkles, color: 'text-primary', bgColor: 'bg-primary/10' },
};

const CreditHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchTransactions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get total count
      const { count } = await supabase
        .from('credit_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setTotalCount(count || 0);

      // Get paginated results
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setTransactions(data as CreditTransaction[] || []);
    } catch (error) {
      console.error('Error fetching credit history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, page]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('credit-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'credit_transactions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          if (page === 1) {
            fetchTransactions();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, page]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>tRIAL - cLIENTS</title>
        <meta name="description" content="View your credit transaction history including purchases, usage, and bonuses." />
      </Helmet>

      {/* Dashboard-style Header */}
      <header className="border-b border-border bg-surface sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="h-9 w-9 rounded-full hover:bg-muted"
                aria-label="Close and return to dashboard"
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-lg sm:text-xl font-display font-bold">Credit History</h1>
                <p className="text-xs sm:text-sm text-foreground-secondary hidden sm:block">
                  Track all your credit transactions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs sm:text-sm">
                {totalCount} transactions
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="hidden sm:flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6">
          <p className="text-foreground-secondary">
            View your complete transaction history including purchases, usage, and earned bonuses.
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transactions</span>
              <Badge variant="secondary">{totalCount} total</Badge>
            </CardTitle>
            <CardDescription>
              Your complete credit transaction history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/20">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                <p className="text-muted-foreground mb-4">
                  Your credit history will appear here once you start using the platform.
                </p>
                <Link to="/pricing">
                  <Button>Get Credits</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {transactions.map((tx) => {
                    const config = typeConfig[tx.type] || typeConfig.bonus;
                    const Icon = config.icon;
                    const isPositive = tx.amount > 0;

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                      >
                        <div className={`p-2.5 rounded-full ${config.bgColor}`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className={`font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{tx.amount}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Balance: {tx.balance_after}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreditHistory;

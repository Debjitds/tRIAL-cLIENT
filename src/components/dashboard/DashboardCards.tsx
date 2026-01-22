import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, CreditCard, Loader2, Gift, Coins, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuotaManagement } from '@/hooks/useQuotaManagement';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

const DashboardCards = () => {
  const { user } = useAuth();
  const { quotaData, loading: quotaLoading, refresh: refreshQuota } = useQuotaManagement();
  const [projectCount, setProjectCount] = useState<number>(0);
  const [weeklyCount, setWeeklyCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchProjectStats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch total SUCCESSFUL project count (exclude failed projects)
      const { count: total, error: totalError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (totalError) throw totalError;

      // Fetch projects from this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count: weekly, error: weeklyError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', weekAgo.toISOString());

      if (weeklyError) throw weeklyError;

      setProjectCount(total || 0);
      setWeeklyCount(weekly || 0);
    } catch (error) {
      console.error('Error fetching project stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectStats();

    if (!user) return;

    // Real-time subscription for projects
    const projectsChannel = supabase
      .channel('dashboard-projects-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchProjectStats();
        }
      )
      .subscribe();

    // Real-time subscription for subscriptions (credits)
    const subscriptionsChannel = supabase
      .channel('dashboard-subscriptions-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          refreshQuota();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(subscriptionsChannel);
    };
  }, [user]);

  // Calculate total free credits remaining
  const getTotalFreeCredits = () => {
    if (!quotaData) return 0;
    const { beginnerLeft, intermediateLeft, veteranLeft } = quotaData.quotas;
    return beginnerLeft + intermediateLeft + veteranLeft;
  };

  // Calculate total purchased credits
  const getPurchasedCredits = () => {
    return quotaData?.credits || 0;
  };

  const isLoading = loading || quotaLoading;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Projects Generated Card */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/30 hover-lift">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Projects Generated
          </CardTitle>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {isLoading ? '-' : projectCount.toString()}
          </div>
          <p className="text-xs text-muted-foreground">Total projects created</p>
          <p className="text-xs text-accent mt-1">
            {isLoading ? '' : `+${weeklyCount} this week`}
          </p>
        </CardContent>
      </Card>

      {/* Credits Breakdown Card */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/30 hover-lift">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Your Credits
          </CardTitle>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {isLoading ? '-' : (getTotalFreeCredits() + getPurchasedCredits()).toString()}
          </div>
          
          {/* Credit Breakdown Visual Indicator */}
          {!isLoading && quotaData && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Gift className="h-3 w-3 text-emerald-400" />
                  Free quota remaining
                </span>
                <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10 text-xs px-1.5 py-0">
                  {getTotalFreeCredits()}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Coins className="h-3 w-3 text-primary" />
                  Purchased credits
                </span>
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 text-xs px-1.5 py-0">
                  {getPurchasedCredits()}
                </Badge>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
            <p className="text-xs text-accent">
              {quotaData ? `${quotaData.plan.toUpperCase()} plan` : ''}
            </p>
            <Link 
              to="/credits/history" 
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <History className="h-3 w-3" />
              View history
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCards;

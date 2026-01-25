import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Gift, Video, Sparkles } from 'lucide-react';
import Navbar from '@/components/navbar';
import { AdRewardHistory } from '@/components/dashboard/AdRewardHistory';
import { AdRewardButton } from '@/components/AdRewardButton';
import { Helmet } from 'react-helmet';

const Rewards = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>tRIAL - cLIENTS</title>
        <meta name="description" content="Earn credits by watching ads and completing reward activities." />
      </Helmet>

      <Navbar />

      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2">
                <Gift className="h-6 w-6 sm:h-7 sm:w-7 text-accent" />
                Rewards
              </h1>
              <p className="text-sm sm:text-base text-foreground-secondary">
                Earn free credits through various reward activities
              </p>
            </div>
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Watch Ads Card */}
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Watch Ads
                </CardTitle>
                <CardDescription>
                  Watch short video ads to earn credits. Available every 30 minutes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-foreground-secondary">
                    <p>• Up to 5 rewards per day</p>
                    <p>• 70% chance to earn 1-2 credits</p>
                  </div>
                  <AdRewardButton />
                </div>
              </CardContent>
            </Card>

            {/* Coming Soon Card */}
            <Card className="hover-lift opacity-75">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  More Rewards
                </CardTitle>
                <CardDescription>
                  Additional ways to earn credits coming soon!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-foreground-secondary space-y-1">
                  <p>• Daily login streaks</p>
                  <p>• Social sharing bonuses</p>
                  <p>• Achievement rewards</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ad Reward History */}
          <section aria-label="Ad reward history">
            <AdRewardHistory />
          </section>
        </div>
      </main>
    </div>
  );
};

export default Rewards;

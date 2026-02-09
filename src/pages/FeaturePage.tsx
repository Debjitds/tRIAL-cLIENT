import { Helmet } from "react-helmet";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Brain, Target, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { GlobalBackground } from "@/components/GlobalBackground";

const FeaturePage = () => {
  return (
    <GlobalBackground>
      <div className="min-h-screen">
        <Helmet>
          <title>AI Client Brief Generator - Endless Design Ideas | Trial Clients</title>
          <meta name="description" content="Generate unlimited, realistic design briefs with AI. From logo design to full website redesigns, get detailed requirements instantly." />
        </Helmet>

        <Navbar />

        <main className="container mx-auto px-4 py-20 sm:py-32">
          {/* Hero */}
          <div className="text-center max-w-4xl mx-auto mb-20 animate-fade-in">
             <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
                <Sparkles className="mr-2 h-4 w-4" /> AI-Powered
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold mb-6 text-foreground leading-tight">
              Infinite <span className="text-gradient">Inspiration</span> on Demand
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Never stare at a blank page again. With one click, generate detailed, realistic client briefs for any industry, style, or difficulty level.
            </p>
            <div className="flex gap-4 justify-center">
                <Button size="lg" className="bg-gradient-primary hover-glow" asChild>
                <Link to="/login/user">Generate a Brief</Link>
                </Button>
                 <Button size="lg" variant="outline" asChild>
                <Link to="/pricing">View Plans</Link>
                </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-32">
            <FeatureCard 
              icon={<Brain className="h-10 w-10 text-primary" />}
              title="Smart Context"
              description="Our AI understands industry nuances. A brief for a law firm will sound professional; a brief for a skate shop will sound edgy."
            />
             <FeatureCard 
              icon={<Target className="h-10 w-10 text-primary" />}
              title="Specific Deliverables"
              description="No vague requests. You get clear requirements: file formats, dimensions, color preferences, and mandatory inclusions."
            />
             <FeatureCard 
              icon={<Shield className="h-10 w-10 text-primary" />}
              title="Safe Failure"
              description="Mess up a project? No problem. Reset and try again. Learn from mistakes without losing real clients."
            />
          </div>

          {/* How It Works */}
          <div className="max-w-5xl mx-auto mb-32">
             <h2 className="text-3xl font-bold text-center mb-16">How It Works</h2>
             <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                    <Step number="01" title="Choose Your Industry" description="Select from Tech, Food, Fashion, and 20+ other industries." />
                    <Step number="02" title="Select Difficulty" description="From 'Easy & Nice' to 'Nightmare Client' mode." />
                    <Step number="03" title="Design & Iterate" description="Submit your work and get instant AI feedback." />
                </div>
                <div className="bg-card border border-border rounded-xl p-8 shadow-2xl skew-y-1">
                    <div className="space-y-4 font-mono text-sm">
                        <div className="flex gap-2">
                            <span className="text-primary">User:</span>
                            <span className="text-foreground">"Generate a brief for a coffee shop."</span>
                        </div>
                        <div className="flex gap-2">
                             <span className="text-blue-400">AI Client:</span>
                             <span className="text-muted-foreground">"Hi! We're 'Bean & Gone', a drive-thru coffee stand for commuters. We need a logo that looks fast but cozy. Can you use orange? But not... TOO orange?"</span>
                        </div>
                         <div className="flex gap-2 pt-4">
                             <span className="text-green-500 animate-pulse">... Awaiting your design</span>
                        </div>
                    </div>
                </div>
             </div>
          </div>

          {/* CTA */}
          <div className="text-center bg-gradient-to-r from-primary/10 to-transparent p-12 rounded-3xl border border-primary/20">
            <h2 className="text-3xl font-bold mb-4">Start Building Your Portfolio Today</h2>
            <p className="text-lg text-muted-foreground mb-8">Join thousands of designers sharpening their skills.</p>
            <Button size="lg" className="bg-gradient-primary hover-glow" asChild>
              <Link to="/login/user">Get Started for Free</Link>
            </Button>
          </div>

        </main>
      </div>
    </GlobalBackground>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="bg-card border border-border/50 p-6 rounded-xl hover:border-primary/50 transition-colors group">
        <div className="mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
        <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
    </div>
);

const Step = ({ number, title, description }: { number: string, title: string, description: string }) => (
    <div className="flex gap-6">
        <div className="font-display font-bold text-4xl text-border text-opacity-50">{number}</div>
        <div>
            <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
        </div>
    </div>
);

export default FeaturePage;

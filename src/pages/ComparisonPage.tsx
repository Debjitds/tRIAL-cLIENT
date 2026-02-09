import { Helmet } from "react-helmet";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { GlobalBackground } from "@/components/GlobalBackground";

const ComparisonPage = () => {
  return (
    <GlobalBackground>
      <div className="min-h-screen">
        <Helmet>
          <title>FakeClients vs Trial Clients - Which Should You Choose? | Trial Clients</title>
          <meta name="description" content="Compare FakeClients vs Trial Clients. See why Trial Clients is the best alternative for realistic AI-generated design briefs and client simulation." />
        </Helmet>

        <Navbar />

        <main className="container mx-auto px-4 py-20 sm:py-32">
          {/* Hero Section */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-foreground">
              Trial Clients vs. FakeClients
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Deciding between FakeClients and Trial Clients? Here's an honest, feature-by-feature breakdown to help you choose the best tool for your design practice.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" className="bg-gradient-primary hover-glow" asChild>
                <Link to="/login/user">Try Trial Clients Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="max-w-5xl mx-auto mb-20 bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xl">
            <div className="grid grid-cols-3 p-6 bg-muted/30 border-b border-border">
              <div className="font-semibold text-lg text-foreground">Feature</div>
              <div className="font-bold text-xl text-center text-muted-foreground">FakeClients</div>
              <div className="font-bold text-xl text-center text-primary">Trial Clients</div>
            </div>

            <div className="divide-y divide-border/50">
              <ComparisonRow 
                feature="Project Realism" 
                competitor="Standard generator" 
                us="AI-Simulated Business Scenarios" 
                highlightUs
              />
              <ComparisonRow 
                feature="Client Interaction" 
                competitor="No interaction" 
                us="Simulated feedback loops" 
                highlightUs
              />
              <ComparisonRow 
                feature="Brief Quality" 
                competitor="Generic prompts" 
                us="Detailed, industry-specific briefs" 
                highlightUs
              />
              <ComparisonRow 
                feature="Asset Generation" 
                competitor="✘" 
                us="AI-generated logos & content" 
              />
              <ComparisonRow 
                feature="Portfolio Ready" 
                competitor="✔" 
                us="✔ (With case study structure)" 
              />
              <ComparisonRow 
                feature="Pricing" 
                competitor="Free / Paid" 
                us="Generous Free Tier / Pro" 
              />
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto mb-20">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-foreground">Why choose FakeClients?</h2>
              <p className="text-muted-foreground mb-4">
                FakeClients is a great tool if you need simple, quick prompts to get started immediately. It's established and offers a good volume of basic practice briefs.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-muted-foreground"><Check className="h-4 w-4 mr-2 text-green-500" /> Good for absolute beginners</li>
                <li className="flex items-center text-muted-foreground"><Check className="h-4 w-4 mr-2 text-green-500" /> Large database of existing briefs</li>
                <li className="flex items-center text-muted-foreground"><Check className="h-4 w-4 mr-2 text-green-500" /> Simple interface</li>
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4 text-foreground">Why choose Trial Clients?</h2>
              <p className="text-muted-foreground mb-4">
                Trial Clients is built for designers who want to experience the <strong>entire client process</strong>, not just the brief. We simulate the back-and-forth, the vague requirements, and the "make the logo bigger" moments.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-foreground"><Check className="h-4 w-4 mr-2 text-primary" /> Realistic AI Client Personas</li>
                <li className="flex items-center text-foreground"><Check className="h-4 w-4 mr-2 text-primary" /> Detailed project constraints & assets</li>
                <li className="flex items-center text-foreground"><Check className="h-4 w-4 mr-2 text-primary" /> Feedback simulation mode</li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center bg-primary/5 rounded-3xl p-12 border border-primary/20 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-foreground">Ready to simulate real work?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of designers leveling up their portfolio with realistic client projects.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-primary hover-glow" asChild>
                <Link to="/login/user">Start Your Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>

        </main>
        
        {/* Simple Footer Reuse if needed or just let MainLayout handle it if wrapped, 
            but here we used Navbar directly so we might want a footer. 
            For now, sticking to page content. */}
      </div>
    </GlobalBackground>
  );
};

const ComparisonRow = ({ feature, competitor, us, highlightUs = false }: { feature: string, competitor: string | React.ReactNode, us: string | React.ReactNode, highlightUs?: boolean }) => (
  <div className="grid grid-cols-3 p-6 items-center hover:bg-muted/10 transition-colors">
    <div className="font-medium text-foreground">{feature}</div>
    <div className="text-center text-muted-foreground">{competitor}</div>
    <div className={`text-center font-semibold ${highlightUs ? 'text-primary' : 'text-foreground'}`}>
      {us}
    </div>
  </div>
);

export default ComparisonPage;

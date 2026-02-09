import { Helmet } from "react-helmet";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GlobalBackground } from "@/components/GlobalBackground";

const UseCasePage = () => {
  return (
    <GlobalBackground>
      <div className="min-h-screen">
        <Helmet>
          <title>Practice Design with AI Clients - Real World Scenarios | Trial Clients</title>
          <meta name="description" content="Learn how designers use Trial Clients to practice handling difficult clients, vague briefs, and real-world feedback loops." />
        </Helmet>

        <Navbar />

        <main className="container mx-auto px-4 py-20 sm:py-32">
          {/* Hero */}
          <div className="text-center max-w-4xl mx-auto mb-20 animate-fade-in">
            <h1 className="text-4xl sm:text-6xl font-bold mb-6 text-foreground leading-tight">
              Master the Art of <span className="text-gradient">Difficult Clients</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Design skills aren't enough. You need to know how to handle vague feedback, scope creep, and changing requirements. Practice safely with AI before facing real clients.
            </p>
            <Button size="lg" className="bg-gradient-primary hover-glow" asChild>
              <Link to="/login/user">Start Practicing Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>

          {/* Problem / Solution */}
          <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
            <div className="order-2 md:order-1">
              <div className="bg-card/50 border border-border rounded-xl p-8 backdrop-blur-sm">
                <h3 className="text-2xl font-bold mb-4 text-destructive">The Problem</h3>
                <ul className="space-y-4">
                  <li className="flex gap-3 text-muted-foreground">
                    <span className="text-destructive font-bold">✗</span>
                    Client briefs are never clear or complete.
                  </li>
                  <li className="flex gap-3 text-muted-foreground">
                    <span className="text-destructive font-bold">✗</span>
                    Feedback is often "Make it pop" or "I'll know it when I see it".
                  </li>
                  <li className="flex gap-3 text-muted-foreground">
                    <span className="text-destructive font-bold">✗</span>
                    Real mistakes cost you money and reputation.
                  </li>
                </ul>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-bold mb-6">Why Portfolio Projects Fail</h2>
              <p className="text-lg text-muted-foreground">
                Most portfolio projects are "perfect scenarios". You engage with a theoretical problem, design a perfect solution, and put it on Dribbble. 
                <br /><br />
                <strong>But the real world is messy.</strong> Without showing how you handle constraints and feedback, your portfolio feels empty to hiring managers.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
            <div>
              <h2 className="text-3xl font-bold mb-6">The Trial Clients Solution</h2>
              <p className="text-lg text-muted-foreground mb-6">
                We simulate the entire messy process. You get a brief, you submit work, and our AI clients give you <strong>realistic, sometimes frustrating feedback</strong>.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  <span className="text-foreground">Learn to decipher vague requirements</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  <span className="text-foreground">Practice negotiating scope</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  <span className="text-foreground">Build case studies with real conflict resolution</span>
                </div>
              </div>
            </div>
             <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl p-8 border border-white/10 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🤝</div>
                    <div className="text-xl font-bold text-foreground">Real Experience, Zero Risk</div>
                </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Is this good for beginners?</AccordionTrigger>
                <AccordionContent>
                  Yes! We have beginner-friendly briefs that are more structured. As you advance, you can tackle "Nightmare Clients" to test your patience and skills.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Can I use these projects in my portfolio?</AccordionTrigger>
                <AccordionContent>
                  Absolutely. We structure the output so you can easily export the entire conversation and design process as a case study.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Do I need to be a designer?</AccordionTrigger>
                <AccordionContent>
                  While focused on design, developers and copywriters also use Trial Clients to practice client communication and requirement gathering.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to get real practice?</h2>
            <Button size="lg" className="bg-gradient-primary hover-glow" asChild>
              <Link to="/login/user">Start Your First Project</Link>
            </Button>
          </div>

        </main>
      </div>
    </GlobalBackground>
  );
};

export default UseCasePage;

import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import LiquidEther from "@/components/LiquidEther";
import student1 from "@/assets/student1.jpg";
import student2 from "@/assets/student2.jpg";
import student3 from "@/assets/student3.jpg";
import student4 from "@/assets/student4.jpg";

const Hero = () => {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center bg-gradient-hero overflow-hidden pt-20 md:pt-0">
      {/* Background decorations */}
      {/* Background decorations */}
      <div className="absolute inset-0 z-0">
        <LiquidEther
          colors={['#5227FF', '#FF9FFC', '#B19EEF']}
          autoDemo={true}
        />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center max-w-7xl mx-auto pt-10 lg:pt-0">
          
          {/* Left Column - Text Content */}
          <div className="text-left flex flex-col pb-8 lg:pb-0">
            {/* Badge */}
            <div className="inline-flex self-start items-center space-x-2 bg-surface/80 backdrop-blur-sm rounded-full px-3 sm:px-4 py-2 mb-6 sm:mb-8 border border-border/20 animate-fade-in shadow-sm">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-foreground-secondary">
                AI-Powered Project Generation
              </span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-display font-bold leading-tight mb-4 sm:mb-6 animate-slide-up">
              Practice Realistic Client
              <br />
              <span className="text-gradient">Projects Instantly</span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg md:text-xl text-foreground-secondary max-w-xl mb-8 sm:mb-10 animate-fade-in delay-200">
              Practice real client work with AI-generated projects designed for developers and designers facing real-world constraints.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-start gap-4 mb-8 sm:mb-10 w-full sm:w-auto animate-bounce-in delay-400">
              <Button
                size="lg"
                className="bg-gradient-primary hover-glow text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-6 h-auto w-full sm:w-auto"
                asChild
              >
                <Link to="/login/user" className="flex items-center justify-center space-x-2 sm:space-x-3">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Start Building — Free</span>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-6 h-auto hover-lift w-full sm:w-auto text-foreground-secondary border border-border/20 bg-surface/30 backdrop-blur-sm shadow-sm"
                  >
                    <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Watch Demo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-black/95 border-border/20">
                  <div className="relative w-full aspect-video">
                    <iframe
                      width="100%"
                      height="100%"
                      src="https://www.youtube.com/embed/9FSNgIKvHew?autoplay=1"
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full"
                    ></iframe>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Social proof embedded underneath CTA */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-xs sm:text-sm text-foreground-secondary animate-fade-in delay-600 mt-2">
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  {[student1, student2, student3, student4].map((img, i) => (
                    <div 
                      key={i}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-background overflow-hidden"
                    >
                      <img src={img} alt={`Student ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <span>1000+ building projects</span>
              </div>
              <div className="w-1 h-1 bg-muted rounded-full hidden sm:block self-center"></div>
              <div className="flex items-center gap-1 font-medium text-foreground">
                ⭐ Highly realistic outputs
              </div>
            </div>
          </div>

          {/* Right Column - Visual Proof Mockup */}
          <div className="w-full h-full flex items-center justify-center lg:justify-end animate-fade-in [animation-delay:600ms] relative">
            <div className="w-full max-w-2xl bg-white/70 dark:bg-[#0F0F13]/90 backdrop-blur-xl border border-border/50 dark:border-border/40 rounded-xl p-5 sm:p-7 mb-4 shadow-2xl dark:shadow-black/50 text-left animate-slide-up [animation-delay:500ms] overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl opacity-50 pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row justify-between items-start mb-5 gap-4 border-b border-border/20 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/20 text-primary text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-sm">E-Commerce</span>
                    <span className="bg-muted dark:bg-zinc-800/80 border border-border dark:border-zinc-700 text-muted-foreground dark:text-zinc-300 text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-sm">Intermediate</span>
                  </div>
                  <h3 className="text-xl font-display font-semibold text-foreground">Artisan Coffee Subscription Platform</h3>
                  <p className="text-xs text-foreground-secondary mt-1">Client: Brew & Bean Roasters</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Project Context</h4>
                  <p className="text-sm text-foreground-secondary leading-relaxed">
                    We need a modern, headless e-commerce store for our artisanal coffee roasting business. The site must support recurring subscriptions, custom roast profiles, and integrate with Stripe for payments.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Timeline</span>
                    <span className="text-xs font-medium text-foreground">6-8 Weeks</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Deliverables</span>
                    <span className="text-xs font-medium text-foreground">5 Core Features</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Target End-User</span>
                    <span className="text-xs font-medium text-foreground">Coffee Enthusiasts</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Spec</span>
                    <span className="text-xs font-medium text-primary line-clamp-1 truncate">14 Requirements</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-5 mt-5 border-t border-border/10 dark:border-border/20">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs border border-primary/20 dark:border-transparent bg-primary/5 dark:bg-[#F5F3FF] text-primary dark:text-[#5227FF] hover:bg-primary/10 dark:hover:bg-[#EDE9FE] shadow-sm"
                >
                  Preview Full Project
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;


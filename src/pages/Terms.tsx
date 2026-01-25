import { Link } from 'react-router-dom';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, UserCheck, Coins, AlertTriangle, CreditCard, Gavel, Shield, Scale, Clock } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-12 sm:py-20 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl sm:text-5xl font-bold text-gradient mb-4">
          Terms & Conditions
        </h1>

        <p className="text-sm text-muted-foreground mb-12">
          Last updated: January 24, 2025
        </p>

        {/* Agreement to Terms */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Agreement to Terms</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <p className="text-muted-foreground leading-relaxed text-sm">
              By accessing or using tRIAL - cLIENTS ("the Service"), you agree to be bound by these Terms
              and Conditions. If you do not agree to these terms, you may not access or use the Service.
              These terms constitute a legally binding agreement between you and tRIAL - cLIENTS regarding
              your use of our AI-powered client brief generation platform.
            </p>
          </div>
        </section>

        {/* Eligibility */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <UserCheck className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Eligibility & Account Registration</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Age Requirements</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                You must be at least 13 years old to use the Service. If you are under 18, you represent
                that you have your parent or guardian's permission to use the Service.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Account Responsibility</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                You are responsible for maintaining the confidentiality of your account credentials and
                for all activities that occur under your account. You must immediately notify us of any
                unauthorized use of your account.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Accurate Information</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                You agree to provide accurate, current, and complete information during registration and
                to update such information to keep it accurate and complete.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">One Account Policy</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Each user may maintain only one account. Creating multiple accounts to abuse free quotas
                or circumvent restrictions is prohibited and may result in account termination.
              </p>
            </div>
          </div>
        </section>

        {/* Credit System */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Coins className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Credit System</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Free Quotas</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Free users receive monthly quotas: 3 Beginner-level briefs and 2 Intermediate-level briefs
                per month. These quotas reset on the first day of each calendar month and do not roll over.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Purchased Credits</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Credits can be purchased through our Pro (15 credits) or ProPlus (30 credits) plans.
                Credit costs vary by level: Beginner (1 credit), Intermediate (2 credits), and Veteran
                (5 credits). New users receive 5 starting credits upon signup.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Credit Usage</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Free quotas are always consumed before purchased credits. Veteran-level briefs require
                a paid plan purchase to unlock.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Non-Transferability</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Credits are non-transferable between accounts. Purchased credits do not expire as long
                as your account remains active. Credits cannot be exchanged for cash or any other value.
              </p>
            </div>
          </div>
        </section>

        {/* Acceptable Use */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Acceptable Use</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Permitted Uses</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                You may use the Service to generate practice briefs for personal skill development,
                portfolio building, and educational purposes. Generated briefs may be used as inspiration
                for your creative work.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Prohibited Activities</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">•</span>
                  <span>Automated access, scraping, or bot usage without authorization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">•</span>
                  <span>Reselling, sublicensing, or commercially redistributing generated content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">•</span>
                  <span>Attempting to bypass credit limits or manipulate the quota system</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">•</span>
                  <span>Creating multiple accounts to abuse free quotas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">•</span>
                  <span>Using the Service for any illegal or harmful purpose</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">•</span>
                  <span>Interfering with the Service's operation or security</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Content Ownership</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Generated briefs are provided for your personal use. While you may use them as practice
                materials, the underlying AI models and platform remain our intellectual property.
              </p>
            </div>
          </div>
        </section>

        {/* Payments and Refunds */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Payments and Refunds</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Payment Processing</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                All payments are processed securely through Razorpay. By making a purchase, you agree
                to Razorpay's terms of service. We do not store your payment card details.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Pricing</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Prices are displayed in the applicable currency and include all applicable taxes. We
                reserve the right to change prices at any time, but changes will not affect existing
                purchased credits.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Refund Policy</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Purchased credits are generally non-refundable once credited to your account. Refunds
                may be considered on a case-by-case basis for unused credits within 7 days of purchase
                in case of technical issues. Contact support for assistance.
              </p>
            </div>
          </div>
        </section>

        {/* Suspension and Termination */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Suspension and Termination</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Grounds for Suspension</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We may suspend or terminate your account immediately if you violate these Terms, engage
                in fraudulent activity, abuse the Service, or pose a security risk to other users.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Termination Process</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                You may terminate your account at any time through your account settings. Upon termination,
                your access to the Service will end and your data will be handled as described in our
                Privacy Policy.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Effect on Credits</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Upon account termination (whether by you or by us), any remaining purchased credits will
                be forfeited and are non-refundable. Free quota allocations are not compensated.
              </p>
            </div>
          </div>
        </section>

        {/* Intellectual Property */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Gavel className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Intellectual Property</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Platform Ownership</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The Service, including its design, features, AI models, and underlying technology, is
                owned by tRIAL - cLIENTS and protected by intellectual property laws.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Generated Content</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                You may use briefs generated through the Service for personal projects and portfolio work.
                You retain rights to any original work you create based on these briefs.
              </p>
            </div>
          </div>
        </section>

        {/* Limitation of Liability */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Limitation of Liability</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Service "As Is"</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The Service is provided "as is" and "as available" without warranties of any kind, either
                express or implied, including but not limited to implied warranties of merchantability,
                fitness for a particular purpose, or non-infringement.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Liability Cap</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                To the maximum extent permitted by law, our total liability for any claims arising from
                your use of the Service shall not exceed the amount you paid us in the twelve (12) months
                preceding the claim.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Exclusion of Damages</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We shall not be liable for any indirect, incidental, special, consequential, or punitive
                damages, including loss of profits, data, or goodwill, arising from your use of the Service.
              </p>
            </div>
          </div>
        </section>

        {/* Service Availability */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Service Availability</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Uptime</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We strive to maintain high availability but do not guarantee uninterrupted access. The
                Service may be temporarily unavailable due to maintenance, updates, or factors beyond
                our control.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Maintenance</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We may perform scheduled maintenance with advance notice when possible. Emergency
                maintenance may occur without prior notice to address security or critical issues.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Force Majeure</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We are not liable for delays or failures in performance resulting from circumstances
                beyond our reasonable control, including natural disasters, acts of government, or
                internet service disruptions.
              </p>
            </div>
          </div>
        </section>

        {/* Governing Law */}
        <section className="mb-12">
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <h3 className="font-semibold mb-2 text-foreground">Governing Law & Disputes</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws. Any
              disputes arising from these Terms or your use of the Service shall first be attempted
              to be resolved through good-faith negotiation. If negotiation fails, disputes may be
              submitted to binding arbitration or resolved in the courts of competent jurisdiction.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-12">
          <div className="text-center p-8 rounded-xl bg-gradient-hero border border-border">
            <h2 className="text-2xl font-bold mb-4">Questions About Terms?</h2>
            <p className="text-muted-foreground mb-6">
              Contact us for clarification on any of these terms.
            </p>
            <a href="mailto:help.trialclients@gmail.com">
              <Button className="bg-gradient-primary">
                help.trialclients@gmail.com
              </Button>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Terms;

import { Link } from 'react-router-dom';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Database, Eye, Cookie, Trash2, UserCheck, Mail, RefreshCw } from 'lucide-react';

const Privacy = () => {
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
          Privacy Policy
        </h1>

        <p className="text-sm text-muted-foreground mb-12">
          Last updated: January 24, 2025
        </p>

        {/* Introduction */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Introduction</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <p className="text-muted-foreground leading-relaxed">
              Welcome to tRIAL - cLIENTS ("we," "our," or "us"). We are committed to protecting your privacy
              and ensuring the security of your personal information. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our AI-powered client brief generation
              platform. By using our service, you consent to the practices described in this policy.
            </p>
          </div>
        </section>

        {/* Information We Collect */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Information We Collect</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-6">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Account Information</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                When you create an account, we collect your email address, display name, and profile picture
                (if provided). This information is used to identify you and personalize your experience.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Usage Data</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We collect information about how you use our service, including projects generated, credit
                transactions, login activity, feature interactions, and preferences. This helps us improve
                the platform and provide better service.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Technical Data</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We automatically collect certain technical information when you access our service, including
                your IP address, browser type and version, device information, operating system, and referring URLs.
                This data helps us maintain security and optimize performance.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Payment Information</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Payment processing is handled by Razorpay. We do not store your credit card numbers or bank
                account details. We only receive transaction metadata such as payment confirmation, amount paid,
                and transaction ID for record-keeping purposes.
              </p>
            </div>
          </div>
        </section>

        {/* How We Use Your Information */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">How We Use Your Information</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <ul className="space-y-3 text-muted-foreground text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span><strong className="text-foreground">Authentication & Account Management:</strong> To create and manage your account, verify your identity, and provide access to our services.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span><strong className="text-foreground">Credit & Quota Tracking:</strong> To manage your free quotas and purchased credits, process transactions, and maintain accurate billing records.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span><strong className="text-foreground">Security & Fraud Prevention:</strong> To detect and prevent fraudulent activities, abuse, unauthorized access, and other security threats.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span><strong className="text-foreground">Service Improvements:</strong> To analyze usage patterns, improve our AI models, enhance features, and develop new functionality.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span><strong className="text-foreground">Communication:</strong> To send important service updates, security alerts, and (with your consent) promotional materials.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Third-Party Services */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Third-Party Services</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">
              We use trusted third-party services to operate our platform. These services have their own privacy policies:
            </p>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Supabase:</strong> For authentication, database storage, and backend infrastructure.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Razorpay:</strong> For secure payment processing (PCI-DSS compliant).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Analytics Providers:</strong> For understanding usage patterns and improving our service.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">AI Service Providers:</strong> For generating client briefs and project content.</span>
              </li>
            </ul>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We may integrate advertising networks in the future to support free features. Any such integration
              will be disclosed and users will have options to manage ad preferences.
            </p>
          </div>
        </section>

        {/* Cookies and Tracking */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Cookie className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Cookies and Tracking</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Essential Cookies</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We use essential cookies to maintain your authenticated session, remember your preferences,
                and ensure the security of your account. These cookies are necessary for the service to function.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Analytics Cookies</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We may use analytics cookies to understand how users interact with our platform. This helps
                us improve the user experience and identify issues.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Managing Cookies</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                You can manage cookie preferences through your browser settings. Note that disabling essential
                cookies may prevent you from using certain features of our service.
              </p>
            </div>
          </div>
        </section>

        {/* Data Retention */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Data Retention</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Active Accounts</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We retain your account data and usage history for as long as your account is active. This
                includes your profile information, generated projects, and credit transaction history.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Account Deletion</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Upon account deletion request, we will delete your personal data within 30 days. Some data
                may be retained in anonymized form for analytics or as required by law.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Backup & Legal Holds</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Backup copies may be retained for up to 90 days after deletion. Data may be preserved longer
                if required for legal proceedings, regulatory compliance, or fraud prevention.
              </p>
            </div>
          </div>
        </section>

        {/* Your Rights */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <UserCheck className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Your Rights</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Depending on your location, you may have the following rights regarding your personal data:
            </p>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Correction:</strong> Request correction of inaccurate or incomplete data.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Deletion:</strong> Request deletion of your personal data (subject to legal obligations).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Data Portability:</strong> Request your data in a structured, machine-readable format.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Withdraw Consent:</strong> Withdraw consent for data processing where applicable.</span>
              </li>
            </ul>
            <p className="text-muted-foreground text-sm leading-relaxed mt-4">
              To exercise any of these rights, please contact us at the email address below.
            </p>
          </div>
        </section>

        {/* Contact Information */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Contact Information</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              If you have any questions about this Privacy Policy or wish to exercise your data rights,
              please contact us at:
            </p>
            <a
              href="mailto:help.trialclients@gmail.com"
              className="text-primary hover:underline font-medium"
            >
              help.trialclients@gmail.com
            </a>
            <p className="text-muted-foreground text-sm leading-relaxed mt-4">
              We aim to respond to all privacy-related inquiries within 30 days.
            </p>
          </div>
        </section>

        {/* Policy Updates */}
        <section className="mb-12">
          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="font-semibold mb-2 text-foreground">Policy Updates</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will be posted on this page
              with an updated "Last updated" date. For significant changes, we will notify you via email
              or through a prominent notice on our platform. Your continued use of the service after
              changes constitutes acceptance of the updated policy.
            </p>
          </div>
        </section>

        {/* Back to Home CTA */}
        <div className="text-center p-8 rounded-xl bg-gradient-hero border border-border">
          <h2 className="text-2xl font-bold mb-4">Have Questions?</h2>
          <p className="text-muted-foreground mb-6">
            We're here to help with any privacy concerns.
          </p>
          <a href="mailto:help.trialclients@gmail.com">
            <Button className="bg-gradient-primary">
              Contact Support
            </Button>
          </a>
        </div>
      </main>
    </div>
  );
};

export default Privacy;

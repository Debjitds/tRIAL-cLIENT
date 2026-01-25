import { Link } from 'react-router-dom';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock, ShieldCheck, Server, Key, AlertCircle, Bug, UserCheck, Eye, Mail } from 'lucide-react';

const Security = () => {
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
          Security
        </h1>

        <p className="text-sm text-muted-foreground mb-12">
          Last updated: January 24, 2025
        </p>

        {/* Our Commitment */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Our Commitment to Security</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <p className="text-muted-foreground leading-relaxed text-sm">
              At tRIAL - cLIENTS, security is a core priority. We implement industry-standard practices
              to protect your data, maintain your privacy, and ensure the integrity of our platform.
              This page outlines our security measures and your responsibilities as a user.
            </p>
          </div>
        </section>

        {/* Data Protection */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Data Protection</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Encryption in Transit</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                All data transmitted between your browser and our servers is encrypted using TLS 1.2 or
                higher (HTTPS). This prevents eavesdropping and man-in-the-middle attacks.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Encryption at Rest</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your data is stored in encrypted databases. Sensitive information such as authentication
                tokens and session data are encrypted using industry-standard algorithms.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Secure Credential Storage</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Passwords are never stored in plain text. We use secure hashing algorithms with salting
                to protect user credentials. API keys and secrets are stored in encrypted environment
                variables, never in source code.
              </p>
            </div>
          </div>
        </section>

        {/* Authentication & Access Control */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Key className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Authentication & Access Control</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Secure Authentication</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We use Supabase Auth for secure user authentication, supporting email/password login
                and OAuth providers. All authentication flows follow security best practices.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Row Level Security (RLS)</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Our database implements Row Level Security policies to ensure users can only access
                their own data. This provides an additional layer of protection at the database level.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Session Management</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sessions are managed securely with automatic expiration. JWT tokens are validated on
                every request to ensure continued authorization.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Role-Based Access</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Administrative functions are protected with role-based access control. Only authorized
                personnel can access sensitive system features.
              </p>
            </div>
          </div>
        </section>

        {/* Infrastructure Security */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Server className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Infrastructure Security</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Cloud Infrastructure</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Our platform is hosted on Supabase's secure cloud infrastructure, which provides
                enterprise-grade security, automatic backups, and high availability across multiple
                data centers.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Edge Function Security</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Server-side logic runs in isolated edge functions with strict input validation and
                sanitization. This prevents injection attacks and ensures secure data processing.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Environment Protection</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                All API keys, secrets, and sensitive configuration are stored in secure environment
                variables. These are never exposed in client-side code or version control.
              </p>
            </div>
          </div>
        </section>

        {/* Payment Security */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Payment Security</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">PCI-DSS Compliance</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Payment processing is handled by Razorpay, which is PCI-DSS compliant. This ensures
                your payment information is processed according to the highest security standards.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">No Card Storage</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We never store your credit card numbers, CVV, or banking details on our servers.
                All sensitive payment data is handled directly by Razorpay's secure systems.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Secure Callbacks</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Payment confirmations are verified using cryptographic signatures to ensure
                authenticity and prevent tampering.
              </p>
            </div>
          </div>
        </section>

        {/* User Responsibility */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <UserCheck className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Your Security Responsibilities</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Strong Passwords</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Use a strong, unique password for your account. We recommend at least 12 characters
                including uppercase, lowercase, numbers, and symbols. Consider using a password manager.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Account Sharing</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Do not share your account credentials with others. Each user should have their own
                account to maintain security and accurate usage tracking.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Suspicious Activity</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                If you notice any unauthorized access or suspicious activity on your account,
                change your password immediately and contact our support team.
              </p>
            </div>
          </div>
        </section>

        {/* Security Monitoring */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Security Monitoring</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Login Tracking</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We track login activity including timestamps and IP addresses to detect unauthorized
                access attempts and protect your account.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Abuse Detection</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Automated systems monitor for suspicious patterns such as unusual usage spikes,
                multiple account creation, or potential fraud attempts.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Security Audits</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We regularly review our security practices, update dependencies, and assess
                potential vulnerabilities to maintain a secure platform.
              </p>
            </div>
          </div>
        </section>

        {/* Vulnerability Reporting */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Bug className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Vulnerability Reporting</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Report Security Issues</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                If you discover a security vulnerability in our platform, please report it
                responsibly to our security team. We appreciate your help in keeping our
                platform secure.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Contact</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-2">
                Report security issues to:
              </p>
              <a
                href="mailto:help.trialclients@gmail.com"
                className="text-primary hover:underline font-medium"
              >
                help.trialclients@gmail.com
              </a>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Responsible Disclosure</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Please allow us reasonable time to investigate and address reported vulnerabilities
                before public disclosure. We commit to acknowledging reports within 48 hours and
                keeping you informed of our progress.
              </p>
            </div>
          </div>
        </section>

        {/* Updates */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Security Updates</h2>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <p className="text-muted-foreground text-sm leading-relaxed">
              We continuously improve our security measures. Significant security updates will be
              communicated through our platform or via email. We recommend keeping your contact
              information up to date to receive important security notifications.
            </p>
          </div>
        </section>

        {/* Contact CTA */}
        <div className="text-center p-8 rounded-xl bg-gradient-hero border border-border">
          <h2 className="text-2xl font-bold mb-4">Security Questions?</h2>
          <p className="text-muted-foreground mb-6">
            Our team is here to help with security-related inquiries.
          </p>
          <a href="mailto:help.trialclients@gmail.com">
            <Button className="bg-gradient-primary">
              Contact Security Team
            </Button>
          </a>
        </div>
      </main>
    </div>
  );
};

export default Security;

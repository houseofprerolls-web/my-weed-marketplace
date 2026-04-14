import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Privacy Policy | DaTreehouse',
  description: 'DaTreehouse Privacy Policy - How we collect, use, and protect your information',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last Updated: March 8, 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p>
                DaTreehouse (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our cannabis marketplace platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
              <h3 className="text-xl font-semibold mb-2">2.1 Personal Information</h3>
              <p>We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Name, email address, phone number, and mailing address</li>
                <li>Date of birth and government-issued ID for age verification</li>
                <li>Payment information</li>
                <li>Order history and preferences</li>
                <li>Communications with us</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">2.2 Automatically Collected Information</h3>
              <p>When you use our platform, we automatically collect:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data (pages viewed, time spent, clickstream data)</li>
                <li>Location data (with your permission)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Process and fulfill your orders</li>
                <li>Verify your age and identity (legal requirement)</li>
                <li>Provide customer support</li>
                <li>Send order updates and notifications</li>
                <li>Improve our platform and services</li>
                <li>Prevent fraud and ensure security</li>
                <li>Comply with legal obligations</li>
                <li>Send marketing communications (with your consent)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Information Sharing</h2>
              <p>We may share your information with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Vendors:</strong> To fulfill your orders</li>
                <li><strong>Service Providers:</strong> Who assist with platform operations</li>
                <li><strong>Legal Authorities:</strong> When required by law</li>
                <li><strong>Business Transfers:</strong> In case of merger or acquisition</li>
              </ul>
              <p className="mt-4">
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. ID Document Handling</h2>
              <p>
                We collect government-issued ID documents for age verification purposes only. These documents are:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Encrypted and stored securely</li>
                <li>Accessible only to authorized personnel</li>
                <li>Shared with vendors only when necessary for order fulfillment</li>
                <li>Retained for legal compliance purposes</li>
                <li>Never used for marketing purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your information, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Encryption of sensitive data</li>
                <li>Secure socket layer (SSL) technology</li>
                <li>Regular security audits</li>
                <li>Restricted access to personal information</li>
                <li>Employee training on data protection</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Opt-out of marketing communications</li>
                <li>Withdraw consent</li>
                <li>File a complaint with regulatory authorities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking</h2>
              <p>
                We use cookies and similar technologies to enhance your experience. You can control cookie preferences through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Age Restriction</h2>
              <p>
                Our platform is only available to individuals 21 years of age or older. We do not knowingly collect information from individuals under 21.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on our platform and updating the &quot;Last Updated&quot; date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <p><strong>Email:</strong> privacy@greenzone.com</p>
                <p><strong>Mail:</strong> DaTreehouse Privacy Team, [Address]</p>
                <p><strong>Phone:</strong> 1-800-XXX-XXXX</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

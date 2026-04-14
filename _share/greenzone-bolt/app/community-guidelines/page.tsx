import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Guidelines | Green Zone",
  description: "Rules and guidelines for all Green Zone users and vendors"
};

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Community Guidelines</h1>
        <p className="text-gray-600 mb-8">Last Updated: March 2026</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">Welcome to Green Zone</h2>
            <p className="text-gray-700 mb-4">
              Green Zone is a community-driven platform connecting cannabis enthusiasts with trusted vendors. These Community Guidelines establish standards of behavior for all users, vendors, and participants to ensure a safe, respectful, and trustworthy marketplace.
            </p>
            <p className="text-gray-700">
              By using Green Zone, you agree to follow these guidelines and contribute to a positive community experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Core Values</h2>
            <p className="text-gray-700 mb-4">
              Our community is built on these principles:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Respect:</strong> Treat all users, vendors, and staff with courtesy and professionalism</li>
              <li><strong>Transparency:</strong> Be honest in all interactions, listings, and reviews</li>
              <li><strong>Safety:</strong> Prioritize product safety, legal compliance, and responsible use</li>
              <li><strong>Authenticity:</strong> Maintain genuine profiles, reviews, and business information</li>
              <li><strong>Responsibility:</strong> Use cannabis responsibly and comply with all applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Prohibited Behavior</h2>
            <p className="text-gray-700 mb-4">
              The following behaviors are strictly prohibited and may result in account suspension or termination:
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">1. Harassment and Abuse</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Threatening, bullying, or intimidating other users or vendors</li>
                  <li>Using hate speech, slurs, or discriminatory language</li>
                  <li>Posting or sharing content that promotes violence or harm</li>
                  <li>Stalking, doxxing, or sharing private information without consent</li>
                  <li>Repeatedly contacting users or vendors after being asked to stop</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">2. Fraudulent Vendor Listings</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Operating without proper cannabis business licenses</li>
                  <li>Listing fake, counterfeit, or misrepresented products</li>
                  <li>Using stolen or stock photos to misrepresent products</li>
                  <li>Falsifying lab results or Certificates of Analysis (COAs)</li>
                  <li>Advertising products that don't exist or aren't available</li>
                  <li>Creating duplicate accounts to manipulate visibility</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">3. Fake Reviews and Manipulation</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Writing fake reviews for your own business</li>
                  <li>Paying for or incentivizing positive reviews</li>
                  <li>Posting negative reviews for competitors</li>
                  <li>Creating multiple accounts to manipulate ratings</li>
                  <li>Threatening customers to remove negative reviews</li>
                  <li>Posting reviews without genuine purchase experience</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">4. Illegal Product Listings</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Listing products illegal in your jurisdiction</li>
                  <li>Advertising untested or non-compliant products</li>
                  <li>Selling products containing banned substances</li>
                  <li>Offering products that exceed legal THC limits</li>
                  <li>Promoting interstate sales or shipping where prohibited</li>
                  <li>Marketing to or selling to minors</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">5. Spam and Unwanted Content</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Posting repetitive or irrelevant content</li>
                  <li>Sending unsolicited promotional messages</li>
                  <li>Creating multiple accounts for spam purposes</li>
                  <li>Posting external links or advertisements unrelated to cannabis</li>
                  <li>Automated or bot-generated content</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">6. Scams and Fraud</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Accepting payment without delivering products</li>
                  <li>Phishing for personal or financial information</li>
                  <li>Running bait-and-switch schemes</li>
                  <li>Misrepresenting product quantities or potency</li>
                  <li>Charging for products never delivered</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Expected Behavior</h2>
            <p className="text-gray-700 mb-4">
              We encourage all community members to:
            </p>

            <div className="space-y-4">
              <div className="bg-green-50 p-5 rounded-lg">
                <h3 className="font-bold text-lg mb-2">For Customers</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Provide honest, constructive reviews based on real experiences</li>
                  <li>Communicate respectfully with vendors</li>
                  <li>Report suspicious or fraudulent activity</li>
                  <li>Respect vendor policies and business hours</li>
                  <li>Use cannabis responsibly and legally</li>
                  <li>Help maintain community quality through thoughtful participation</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-5 rounded-lg">
                <h3 className="font-bold text-lg mb-2">For Vendors</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Maintain accurate, honest product listings</li>
                  <li>Respond promptly to customer inquiries</li>
                  <li>Honor advertised prices and promotions</li>
                  <li>Provide excellent customer service</li>
                  <li>Address complaints professionally and fairly</li>
                  <li>Maintain proper licensing and compliance</li>
                  <li>Respect competitors and avoid negative campaigning</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Content Standards</h2>
            <p className="text-gray-700 mb-4">
              All content posted on Green Zone must:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Be relevant to cannabis products, vendors, or industry topics</li>
              <li>Be free from explicit sexual content or nudity</li>
              <li>Not promote illegal activities or substances</li>
              <li>Respect intellectual property rights</li>
              <li>Be accurate and not misleading</li>
              <li>Comply with cannabis advertising regulations</li>
              <li>Include appropriate age warnings (21+)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Review Guidelines</h2>
            <p className="text-gray-700 mb-4">
              Reviews are essential to our community. When posting reviews:
            </p>

            <div className="space-y-3">
              <div>
                <h3 className="font-bold mb-2">✓ Do:</h3>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Base reviews on personal, firsthand experience</li>
                  <li>Be specific about product quality, service, and delivery</li>
                  <li>Provide constructive criticism when appropriate</li>
                  <li>Update reviews if issues are resolved</li>
                  <li>Include relevant details that help other customers</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2">✗ Don't:</h3>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Post reviews for businesses you haven't used</li>
                  <li>Accept payment or incentives for reviews</li>
                  <li>Use profanity or personal attacks</li>
                  <li>Include private information about vendors or staff</li>
                  <li>Post duplicate reviews across multiple accounts</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Privacy and Data Protection</h2>
            <p className="text-gray-700 mb-4">
              Respect the privacy of all community members:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Don't share other users' personal information</li>
              <li>Don't screenshot and share private messages without consent</li>
              <li>Protect your own privacy by not oversharing personal details</li>
              <li>Report privacy violations to Green Zone immediately</li>
              <li>Follow vendor privacy policies when making purchases</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Legal Compliance</h2>
            <p className="text-gray-700 mb-4">
              All users must comply with applicable cannabis laws:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Be 21+ years old to use the platform</li>
              <li>Only purchase cannabis in jurisdictions where it's legal</li>
              <li>Follow local possession limits and consumption laws</li>
              <li>Don't drive or operate machinery while impaired</li>
              <li>Don't transport cannabis across state or federal lines</li>
              <li>Respect workplace and housing policies regarding cannabis use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Reporting Violations</h2>
            <p className="text-gray-700 mb-4">
              Help us maintain a safe community by reporting violations:
            </p>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-bold mb-3">How to Report</h3>
              <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                <li>Use the "Report" button on profiles, reviews, or content when available</li>
                <li>Provide specific details about the violation</li>
                <li>Include screenshots or evidence when possible</li>
                <li>Contact support@greenzone.com for serious violations</li>
              </ol>

              <h3 className="font-bold mt-4 mb-3">What Happens After Reporting</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Our team reviews all reports within 48 hours</li>
                <li>We investigate and gather additional information</li>
                <li>Appropriate action is taken based on findings</li>
                <li>Reporters are notified of the outcome when appropriate</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Consequences of Violations</h2>
            <p className="text-gray-700 mb-4">
              Violations of these Community Guidelines may result in:
            </p>

            <div className="space-y-3">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="font-bold">First Offense (Minor Violations)</p>
                <p className="text-gray-700">Warning and content removal</p>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="font-bold">Repeated Violations</p>
                <p className="text-gray-700">Temporary account suspension (7-30 days)</p>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <p className="font-bold">Serious or Repeated Serious Violations</p>
                <p className="text-gray-700">Permanent account termination and platform ban</p>
              </div>
            </div>

            <p className="text-gray-700 mt-4">
              Serious violations (fraud, harassment, illegal activity) may result in immediate permanent ban and reporting to appropriate authorities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Appeals Process</h2>
            <p className="text-gray-700 mb-4">
              If you believe action was taken in error:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>Email appeals@greenzone.com within 14 days of the action</li>
              <li>Provide your account information and explanation</li>
              <li>Include any relevant evidence supporting your appeal</li>
              <li>Our team will review and respond within 7 business days</li>
            </ol>
            <p className="text-gray-700 mt-4">
              Appeal decisions are final. Multiple frivolous appeals may result in additional restrictions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Platform Improvements</h2>
            <p className="text-gray-700 mb-4">
              Help us improve Green Zone by:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Providing constructive feedback about platform features</li>
              <li>Reporting bugs or technical issues</li>
              <li>Suggesting new features or improvements</li>
              <li>Participating in community surveys and feedback sessions</li>
              <li>Contributing helpful strain information and education</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Updates to Guidelines</h2>
            <p className="text-gray-700 mb-4">
              Green Zone may update these Community Guidelines as needed. Material changes will be communicated through:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Email notifications to registered users</li>
              <li>Platform announcements and notifications</li>
              <li>Updated "Last Modified" date on this page</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Continued use of the platform after updates constitutes acceptance of revised guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-gray-700 mb-4">
              For questions about these guidelines or to report violations:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700 font-medium">Green Zone Community Team</p>
              <p className="text-gray-700">Email: community@greenzone.com</p>
              <p className="text-gray-700">Report Violations: support@greenzone.com</p>
              <p className="text-gray-700">Appeals: appeals@greenzone.com</p>
              <p className="text-gray-700">Phone: 1-800-GREEN-ZONE</p>
            </div>
          </section>

          <section className="bg-green-50 p-6 rounded-lg mt-8">
            <h3 className="text-xl font-bold mb-3">Building a Better Community Together</h3>
            <p className="text-gray-700">
              Green Zone's strength comes from our community of respectful, honest, and engaged users and vendors. By following these guidelines, you help create a trustworthy marketplace where everyone can discover quality cannabis products safely and confidently.
            </p>
            <p className="text-gray-700 mt-3">
              Thank you for being part of the Green Zone community.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

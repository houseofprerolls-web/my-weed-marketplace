import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Community Guidelines | Da Treehouse',
  description: 'Rules and guidelines for all Da Treehouse users and vendors',
};

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen bg-black text-gray-200">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-8">Community Guidelines</h1>
        <p className="text-gray-400 mb-8">Last updated: March 2026</p>

        <div className="prose prose-invert prose-lg max-w-none space-y-8 prose-headings:text-white prose-a:text-green-400">
          <section>
            <h2 className="text-2xl font-bold mb-4">Welcome to Da Treehouse</h2>
            <p className="text-gray-300 mb-4">
              Da Treehouse is a community-driven platform connecting cannabis enthusiasts with trusted vendors. These Community Guidelines establish standards of behavior for all users, vendors, and participants to ensure a safe, respectful, and trustworthy marketplace.
            </p>
            <p className="text-gray-300">
              By using Da Treehouse, you agree to follow these guidelines and contribute to a positive community experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Core Values</h2>
            <p className="text-gray-300 mb-4">
              Our community is built on these principles:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li><strong>Respect:</strong> Treat all users, vendors, and staff with courtesy and professionalism</li>
              <li><strong>Transparency:</strong> Be honest in all interactions, listings, and reviews</li>
              <li><strong>Safety:</strong> Prioritize product safety, legal compliance, and responsible use</li>
              <li><strong>Authenticity:</strong> Maintain genuine profiles, reviews, and business information</li>
              <li><strong>Responsibility:</strong> Use cannabis responsibly and comply with all applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Prohibited Behavior</h2>
            <p className="text-gray-300 mb-4">
              The following behaviors are strictly prohibited and may result in account suspension or termination:
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">1. Harassment and Abuse</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                  <li>Threatening, bullying, or intimidating other users or vendors</li>
                  <li>Using hate speech, slurs, or discriminatory language</li>
                  <li>Posting or sharing content that promotes violence or harm</li>
                  <li>Stalking, doxxing, or sharing private information without consent</li>
                  <li>Repeatedly contacting users or vendors after being asked to stop</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">2. Fraudulent Vendor Listings</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
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
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
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
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
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
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                  <li>Posting repetitive or irrelevant content</li>
                  <li>Sending unsolicited promotional messages</li>
                  <li>Creating multiple accounts for spam purposes</li>
                  <li>Posting external links or advertisements unrelated to cannabis</li>
                  <li>Automated or bot-generated content</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">6. Scams and Fraud</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
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
            <p className="text-gray-300 mb-4">
              We encourage all community members to:
            </p>

            <div className="space-y-4">
              <div className="rounded-lg border border-green-900/30 bg-green-950/20 p-5">
                <h3 className="font-bold text-lg text-white mb-2">For customers</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                  <li>Provide honest, constructive reviews based on real experiences</li>
                  <li>Communicate respectfully with vendors</li>
                  <li>Report suspicious or fraudulent activity</li>
                  <li>Respect vendor policies and business hours</li>
                  <li>Use cannabis responsibly and legally</li>
                  <li>Help maintain community quality through thoughtful participation</li>
                </ul>
              </div>

              <div className="rounded-lg border border-blue-500/25 bg-blue-950/20 p-5">
                <h3 className="font-bold text-lg text-white mb-2">For vendors</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
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
            <p className="text-gray-300 mb-4">
              All content posted on Da Treehouse must:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
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
            <p className="text-gray-300 mb-4">
              Reviews are essential to our community. When posting reviews:
            </p>

            <div className="space-y-3">
              <div>
                <h3 className="font-bold mb-2">✓ Do:</h3>
                <ul className="list-disc pl-6 space-y-1 text-gray-300">
                  <li>Base reviews on personal, firsthand experience</li>
                  <li>Be specific about product quality, service, and delivery</li>
                  <li>Provide constructive criticism when appropriate</li>
                  <li>Update reviews if issues are resolved</li>
                  <li>Include relevant details that help other customers</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2">✗ Don't:</h3>
                <ul className="list-disc pl-6 space-y-1 text-gray-300">
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
            <p className="text-gray-300 mb-4">
              Respect the privacy of all community members:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Don't share other users' personal information</li>
              <li>Don't screenshot and share private messages without consent</li>
              <li>Protect your own privacy by not oversharing personal details</li>
              <li>Report privacy violations to Da Treehouse immediately</li>
              <li>Follow vendor privacy policies when making purchases</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Legal Compliance</h2>
            <p className="text-gray-300 mb-4">
              All users must comply with applicable cannabis laws:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
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
            <p className="text-gray-300 mb-4">
              Help us maintain a safe community by reporting violations:
            </p>

            <div className="rounded-lg border border-green-900/25 bg-gray-900/50 p-6">
              <h3 className="font-bold text-white mb-3">How to report</h3>
              <ol className="list-decimal pl-6 space-y-2 text-gray-300">
                <li>Use the "Report" button on profiles, reviews, or content when available</li>
                <li>Provide specific details about the violation</li>
                <li>Include screenshots or evidence when possible</li>
                <li>Contact support@datreehouse.com for serious violations</li>
              </ol>

              <h3 className="font-bold text-white mt-4 mb-3">What happens after reporting</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Our team reviews all reports within 48 hours</li>
                <li>We investigate and gather additional information</li>
                <li>Appropriate action is taken based on findings</li>
                <li>Reporters are notified of the outcome when appropriate</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Consequences of Violations</h2>
            <p className="text-gray-300 mb-4">
              Violations of these Community Guidelines may result in:
            </p>

            <div className="space-y-3">
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/25 p-4">
                <p className="font-bold text-white">First offense (minor violations)</p>
                <p className="text-gray-300">Warning and content removal</p>
              </div>

              <div className="rounded-lg border border-orange-500/30 bg-orange-950/20 p-4">
                <p className="font-bold text-white">Repeated violations</p>
                <p className="text-gray-300">Temporary account suspension (7-30 days)</p>
              </div>

              <div className="rounded-lg border border-red-500/35 bg-red-950/25 p-4">
                <p className="font-bold text-white">Serious or repeated serious violations</p>
                <p className="text-gray-300">Permanent account termination and platform ban</p>
              </div>
            </div>

            <p className="text-gray-300 mt-4">
              Serious violations (fraud, harassment, illegal activity) may result in immediate permanent ban and reporting to appropriate authorities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Appeals Process</h2>
            <p className="text-gray-300 mb-4">
              If you believe action was taken in error:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-gray-300">
              <li>Email appeals@datreehouse.com within 14 days of the action</li>
              <li>Provide your account information and explanation</li>
              <li>Include any relevant evidence supporting your appeal</li>
              <li>Our team will review and respond within 7 business days</li>
            </ol>
            <p className="text-gray-300 mt-4">
              Appeal decisions are final. Multiple frivolous appeals may result in additional restrictions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Platform Improvements</h2>
            <p className="text-gray-300 mb-4">
              Help us improve Da Treehouse by:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Providing constructive feedback about platform features</li>
              <li>Reporting bugs or technical issues</li>
              <li>Suggesting new features or improvements</li>
              <li>Participating in community surveys and feedback sessions</li>
              <li>Contributing helpful strain information and education</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Updates to Guidelines</h2>
            <p className="text-gray-300 mb-4">
              Da Treehouse may update these Community Guidelines as needed. Material changes will be communicated through:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Email notifications to registered users</li>
              <li>Platform announcements and notifications</li>
              <li>Updated "Last Modified" date on this page</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Continued use of the platform after updates constitutes acceptance of revised guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-gray-300 mb-4">
              For questions about these guidelines or to report violations:
            </p>
            <div className="rounded-lg border border-green-900/25 bg-gray-900/50 p-6">
              <p className="text-gray-300 font-medium">Da Treehouse community team</p>
              <p className="text-gray-300">Email: community@datreehouse.com</p>
              <p className="text-gray-300">Report violations: support@datreehouse.com</p>
              <p className="text-gray-300">Appeals: appeals@datreehouse.com</p>
            </div>
          </section>

          <section className="mt-8 rounded-lg border border-green-900/30 bg-green-950/20 p-6">
            <h3 className="text-xl font-bold text-white mb-3">Building a better community together</h3>
            <p className="text-gray-300">
              Da Treehouse's strength comes from our community of respectful, honest, and engaged users and vendors. By following these guidelines, you help create a trustworthy marketplace where everyone can discover quality cannabis products safely and confidently.
            </p>
            <p className="text-gray-300 mt-3">
              Thank you for being part of the Da Treehouse community.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

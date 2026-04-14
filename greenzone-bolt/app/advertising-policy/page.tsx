import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Advertising Policy | Da Treehouse",
  description: "Guidelines for vendor advertising and marketing on the Da Treehouse platform"
};

export default function AdvertisingPolicyPage() {
  return (
    <div className="min-h-screen bg-black text-gray-200">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-8">Advertising Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: March 2026</p>

        <div className="prose prose-invert prose-lg max-w-none space-y-8 prose-headings:text-white prose-a:text-green-400">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Overview</h2>
            <p className="text-gray-300 mb-4">
              This Advertising Policy governs all marketing, promotional, and advertising activities conducted by vendors on the Da Treehouse platform. This policy ensures compliance with cannabis advertising regulations and protects both vendors and customers.
            </p>
            <p className="text-gray-300">
              All vendors must adhere to these guidelines when creating listings, posting deals, using promotional tools, or purchasing advertising placements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Prohibited Advertising Practices</h2>
            <p className="text-gray-300 mb-4">
              The following advertising practices are strictly prohibited on the Da Treehouse platform:
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">2.1 False Potency Claims</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                  <li>Exaggerating THC, CBD, or cannabinoid percentages</li>
                  <li>Advertising potency levels not supported by laboratory testing</li>
                  <li>Using terms like "strongest," "most potent," or "highest THC" without verifiable evidence</li>
                  <li>Displaying inaccurate or outdated Certificate of Analysis (COA) information</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">2.2 Medical Treatment Claims</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                  <li>Claiming products treat, cure, or prevent any disease or medical condition</li>
                  <li>Advertising products as alternatives to FDA-approved medications</li>
                  <li>Making therapeutic or medicinal claims without proper authorization</li>
                  <li>Using language that implies medical advice or diagnosis</li>
                  <li>Featuring testimonials that make health or medical claims</li>
                </ul>
                <p className="text-gray-300 mt-3 italic">
                  Example prohibited claims: "Cures anxiety," "Treats chronic pain," "Eliminates insomnia," "Cancer treatment alternative"
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">2.3 Illegal Product Promotion</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                  <li>Advertising products not legally permitted in your jurisdiction</li>
                  <li>Promoting products that exceed legal THC limits</li>
                  <li>Advertising untested or non-compliant products</li>
                  <li>Marketing products containing banned substances or additives</li>
                  <li>Promoting interstate cannabis sales or shipping</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">2.4 Advertising Targeting Minors</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                  <li>Using imagery, characters, or language appealing to children</li>
                  <li>Featuring cartoon characters, toys, or child-friendly branding</li>
                  <li>Using candy-like packaging or sweet flavor names in a manner that appeals to minors</li>
                  <li>Advertising near schools, playgrounds, or youth-oriented venues</li>
                  <li>Using social media influencers or celebrities popular with minors</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">2.5 Misleading or Deceptive Advertising</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                  <li>False or misleading product descriptions</li>
                  <li>Advertising products as "organic," "all-natural," or "pesticide-free" without certification</li>
                  <li>Fake reviews or manipulated ratings</li>
                  <li>Hidden fees or undisclosed pricing</li>
                  <li>Bait-and-switch tactics or unavailable advertised products</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Allowed Promotional Tools</h2>
            <p className="text-gray-300 mb-4">
              Da Treehouse provides vendors with compliant advertising tools to promote their business effectively:
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">3.1 Banner Advertisements</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                  <li>Display banner ads on homepage and category pages when available for your account</li>
                  <li>Rotating banner placements for featured vendors</li>
                  <li>All banner content must comply with advertising guidelines</li>
                  <li>Banner ads must include required disclaimers and age warnings</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">3.2 Featured Vendor Placements</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                  <li>Priority positioning in search results when offered on your account</li>
                  <li>Featured vendor badges and visual prominence</li>
                  <li>Homepage featured vendor sections</li>
                  <li>Category page top placements</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">3.3 Deal Promotions</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                  <li>Post limited-time deals and promotions</li>
                  <li>Create discount codes and special offers</li>
                  <li>Feature deals in dedicated deals section</li>
                  <li>Featured deal spotlights when available</li>
                  <li>All deals must honor advertised prices and terms</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">3.4 Map Marker Promotions</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                  <li>Enhanced map visibility with premium markers</li>
                  <li>Priority display in geographic searches</li>
                  <li>Custom map pin styling for premium vendors</li>
                  <li>Map-based deal notifications</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">3.5 Profile Enhancements</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                  <li>Verified vendor badges</li>
                  <li>Enhanced photo and video galleries</li>
                  <li>Detailed business descriptions and storytelling</li>
                  <li>Social media integration and links</li>
                  <li>Customer review showcasing</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Required Disclaimers and Warnings</h2>
            <p className="text-gray-300 mb-4">
              All vendor advertising must include appropriate disclaimers and warnings:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>21+ age requirement clearly displayed</li>
              <li>Cannabis product warnings as required by state law</li>
              <li>"For adult use only" or similar language</li>
              <li>Pregnancy and breastfeeding warnings where applicable</li>
              <li>Impairment warnings for driving or operating machinery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Content Approval and Moderation</h2>
            <p className="text-gray-300 mb-4">
              Da Treehouse reserves the right to review, approve, or reject any advertising content. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Product descriptions and images</li>
              <li>Banner advertisements and promotional graphics</li>
              <li>Deal announcements and special offers</li>
              <li>Business descriptions and profile content</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Content that violates this policy may be removed without notice. Repeated violations may result in account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Geographic Restrictions</h2>
            <p className="text-gray-300 mb-4">
              Vendors must only advertise within jurisdictions where they are licensed to operate. Advertising to customers outside your licensed delivery area is prohibited.
            </p>
            <p className="text-gray-300">
              Da Treehouse uses geolocation to ensure advertisements are shown only to eligible customers in permitted areas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Third-Party Advertising</h2>
            <p className="text-gray-300 mb-4">
              Vendors may not:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Advertise on behalf of other vendors or businesses</li>
              <li>Resell or transfer advertising placements</li>
              <li>Use affiliate links or third-party tracking in listings</li>
              <li>Include external advertising or promotional content in profiles</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Intellectual Property in Advertising</h2>
            <p className="text-gray-300 mb-4">
              All advertising content must respect intellectual property rights:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Use only images and content you own or have licensed</li>
              <li>Do not use copyrighted images without permission</li>
              <li>Do not infringe on trademarks of other brands</li>
              <li>Respect strain names and genetics attribution</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Consequences of Policy Violations</h2>
            <p className="text-gray-300 mb-4">
              Violations of this Advertising Policy may result in:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Removal of non-compliant advertising content</li>
              <li>Suspension of advertising privileges</li>
              <li>Account warnings or temporary suspension</li>
              <li>Permanent account termination for serious or repeated violations</li>
              <li>Forfeiture of paid advertising placements without refund</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Advertising Best Practices</h2>
            <p className="text-gray-300 mb-4">
              To create effective, compliant advertising on Da Treehouse:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Focus on product quality, variety, and customer service</li>
              <li>Use clear, professional product photography</li>
              <li>Provide detailed, accurate product descriptions</li>
              <li>Highlight your business values and commitment to quality</li>
              <li>Showcase authentic customer reviews and ratings</li>
              <li>Promote special offers and deals transparently</li>
              <li>Maintain responsive customer communication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Policy Updates</h2>
            <p className="text-gray-300 mb-4">
              Da Treehouse may update this Advertising Policy as regulations and industry standards evolve. Vendors will be notified of material changes via email and platform notifications.
            </p>
            <p className="text-gray-300">
              Continued use of advertising tools after policy updates constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Contact and Support</h2>
            <p className="text-gray-300 mb-4">
              For questions about advertising compliance or to report policy violations:
            </p>
            <div className="rounded-lg border border-green-900/25 bg-gray-900/50 p-6">
              <p className="text-gray-300 font-medium">Da Treehouse Advertising Compliance</p>
              <p className="text-gray-300">Email: support@datreehouse.com</p>
            </div>
          </section>

          <section className="mt-8 rounded-lg border border-green-900/30 bg-green-950/20 p-6">
            <h3 className="text-xl font-bold text-white mb-3">Commitment to Compliance</h3>
            <p className="text-gray-300">
              By using Da Treehouse's advertising tools and promotional features, you agree to comply with this Advertising Policy and all applicable cannabis advertising regulations in your jurisdiction.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

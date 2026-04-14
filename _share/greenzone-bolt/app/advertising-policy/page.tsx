import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Advertising Policy | Green Zone",
  description: "Guidelines for vendor advertising and marketing on the Green Zone platform"
};

export default function AdvertisingPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Advertising Policy</h1>
        <p className="text-gray-600 mb-8">Last Updated: March 2026</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Overview</h2>
            <p className="text-gray-700 mb-4">
              This Advertising Policy governs all marketing, promotional, and advertising activities conducted by vendors on the Green Zone platform. This policy ensures compliance with cannabis advertising regulations and protects both vendors and customers.
            </p>
            <p className="text-gray-700">
              All vendors must adhere to these guidelines when creating listings, posting deals, using promotional tools, or purchasing advertising placements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Prohibited Advertising Practices</h2>
            <p className="text-gray-700 mb-4">
              The following advertising practices are strictly prohibited on the Green Zone platform:
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">2.1 False Potency Claims</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Exaggerating THC, CBD, or cannabinoid percentages</li>
                  <li>Advertising potency levels not supported by laboratory testing</li>
                  <li>Using terms like "strongest," "most potent," or "highest THC" without verifiable evidence</li>
                  <li>Displaying inaccurate or outdated Certificate of Analysis (COA) information</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">2.2 Medical Treatment Claims</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Claiming products treat, cure, or prevent any disease or medical condition</li>
                  <li>Advertising products as alternatives to FDA-approved medications</li>
                  <li>Making therapeutic or medicinal claims without proper authorization</li>
                  <li>Using language that implies medical advice or diagnosis</li>
                  <li>Featuring testimonials that make health or medical claims</li>
                </ul>
                <p className="text-gray-700 mt-3 italic">
                  Example prohibited claims: "Cures anxiety," "Treats chronic pain," "Eliminates insomnia," "Cancer treatment alternative"
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">2.3 Illegal Product Promotion</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Advertising products not legally permitted in your jurisdiction</li>
                  <li>Promoting products that exceed legal THC limits</li>
                  <li>Advertising untested or non-compliant products</li>
                  <li>Marketing products containing banned substances or additives</li>
                  <li>Promoting interstate cannabis sales or shipping</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">2.4 Advertising Targeting Minors</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Using imagery, characters, or language appealing to children</li>
                  <li>Featuring cartoon characters, toys, or child-friendly branding</li>
                  <li>Using candy-like packaging or sweet flavor names in a manner that appeals to minors</li>
                  <li>Advertising near schools, playgrounds, or youth-oriented venues</li>
                  <li>Using social media influencers or celebrities popular with minors</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">2.5 Misleading or Deceptive Advertising</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
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
            <p className="text-gray-700 mb-4">
              Green Zone provides vendors with compliant advertising tools to promote their business effectively:
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">3.1 Banner Advertisements</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Display banner ads on homepage and category pages (Premium Plan)</li>
                  <li>Rotating banner placements for featured vendors</li>
                  <li>All banner content must comply with advertising guidelines</li>
                  <li>Banner ads must include required disclaimers and age warnings</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">3.2 Featured Vendor Placements</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Priority positioning in search results (Growth and Premium Plans)</li>
                  <li>Featured vendor badges and visual prominence</li>
                  <li>Homepage featured vendor sections</li>
                  <li>Category page top placements</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">3.3 Deal Promotions</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Post limited-time deals and promotions</li>
                  <li>Create discount codes and special offers</li>
                  <li>Feature deals in dedicated deals section</li>
                  <li>Daily deal spotlights for premium vendors</li>
                  <li>All deals must honor advertised prices and terms</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">3.4 Map Marker Promotions</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Enhanced map visibility with premium markers</li>
                  <li>Priority display in geographic searches</li>
                  <li>Custom map pin styling for premium vendors</li>
                  <li>Map-based deal notifications</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">3.5 Profile Enhancements</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
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
            <p className="text-gray-700 mb-4">
              All vendor advertising must include appropriate disclaimers and warnings:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>21+ age requirement clearly displayed</li>
              <li>Cannabis product warnings as required by state law</li>
              <li>"For adult use only" or similar language</li>
              <li>Pregnancy and breastfeeding warnings where applicable</li>
              <li>Impairment warnings for driving or operating machinery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Advertising Plan Features</h2>
            <p className="text-gray-700 mb-4">
              Advertising capabilities vary by subscription plan:
            </p>

            <div className="bg-gray-50 p-6 rounded-lg space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-2">Starter Plan ($99/month)</h3>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Basic business listing</li>
                  <li>Standard search placement</li>
                  <li>Limited deal posting</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2">Growth Plan ($299/month)</h3>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Priority search placement</li>
                  <li>Verified vendor badge</li>
                  <li>Up to 10 active deals</li>
                  <li>Enhanced map visibility</li>
                  <li>Social media integration</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2">Premium Plan ($599/month)</h3>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Homepage banner placements</li>
                  <li>Top priority search placement</li>
                  <li>Unlimited deal posting</li>
                  <li>Featured vendor status</li>
                  <li>Premium map markers</li>
                  <li>Dedicated promotional support</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Content Approval and Moderation</h2>
            <p className="text-gray-700 mb-4">
              Green Zone reserves the right to review, approve, or reject any advertising content. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Product descriptions and images</li>
              <li>Banner advertisements and promotional graphics</li>
              <li>Deal announcements and special offers</li>
              <li>Business descriptions and profile content</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Content that violates this policy may be removed without notice. Repeated violations may result in account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Geographic Restrictions</h2>
            <p className="text-gray-700 mb-4">
              Vendors must only advertise within jurisdictions where they are licensed to operate. Advertising to customers outside your licensed delivery area is prohibited.
            </p>
            <p className="text-gray-700">
              Green Zone uses geolocation to ensure advertisements are shown only to eligible customers in permitted areas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Third-Party Advertising</h2>
            <p className="text-gray-700 mb-4">
              Vendors may not:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Advertise on behalf of other vendors or businesses</li>
              <li>Resell or transfer advertising placements</li>
              <li>Use affiliate links or third-party tracking in listings</li>
              <li>Include external advertising or promotional content in profiles</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Intellectual Property in Advertising</h2>
            <p className="text-gray-700 mb-4">
              All advertising content must respect intellectual property rights:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Use only images and content you own or have licensed</li>
              <li>Do not use copyrighted images without permission</li>
              <li>Do not infringe on trademarks of other brands</li>
              <li>Respect strain names and genetics attribution</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Consequences of Policy Violations</h2>
            <p className="text-gray-700 mb-4">
              Violations of this Advertising Policy may result in:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Removal of non-compliant advertising content</li>
              <li>Suspension of advertising privileges</li>
              <li>Account warnings or temporary suspension</li>
              <li>Permanent account termination for serious or repeated violations</li>
              <li>Forfeiture of paid advertising placements without refund</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Advertising Best Practices</h2>
            <p className="text-gray-700 mb-4">
              To create effective, compliant advertising on Green Zone:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
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
            <h2 className="text-2xl font-bold mb-4">12. Policy Updates</h2>
            <p className="text-gray-700 mb-4">
              Green Zone may update this Advertising Policy as regulations and industry standards evolve. Vendors will be notified of material changes via email and platform notifications.
            </p>
            <p className="text-gray-700">
              Continued use of advertising tools after policy updates constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Contact and Support</h2>
            <p className="text-gray-700 mb-4">
              For questions about advertising compliance or to report policy violations:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700 font-medium">Green Zone Advertising Compliance</p>
              <p className="text-gray-700">Email: advertising@greenzone.com</p>
              <p className="text-gray-700">Phone: 1-800-GREEN-ZONE</p>
            </div>
          </section>

          <section className="bg-green-50 p-6 rounded-lg mt-8">
            <h3 className="text-xl font-bold mb-3">Commitment to Compliance</h3>
            <p className="text-gray-700">
              By using Green Zone's advertising tools and promotional features, you agree to comply with this Advertising Policy and all applicable cannabis advertising regulations in your jurisdiction.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

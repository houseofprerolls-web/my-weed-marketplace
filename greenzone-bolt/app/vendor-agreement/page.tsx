import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Vendor Agreement | Da Treehouse',
  description: 'Terms and conditions for vendors operating on the Da Treehouse platform',
};

export default function VendorAgreementPage() {
  return (
    <div className="min-h-screen bg-black text-gray-200">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-8">Vendor Agreement</h1>
        <p className="text-gray-400 mb-8">Last updated: March 2026</p>

        <div className="prose prose-invert prose-lg max-w-none space-y-8 prose-headings:text-white prose-a:text-green-400">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-300 mb-4">
              By registering as a vendor on the Da Treehouse platform ("Platform"), you agree to be bound by this Vendor Agreement ("Agreement"). This Agreement governs your use of the Platform and the services provided to facilitate your cannabis delivery business.
            </p>
            <p className="text-gray-300">
              If you do not agree to all terms and conditions of this Agreement, you may not access or use the Platform as a vendor.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Vendor Licensing Responsibility</h2>
            <p className="text-gray-300 mb-4">
              You represent and warrant that you hold all necessary state and local licenses required to legally operate a cannabis delivery business in your jurisdiction. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Maintain valid and current cannabis business licenses at all times</li>
              <li>Provide proof of licensing upon request by Da Treehouse</li>
              <li>Immediately notify Da Treehouse of any license suspension, revocation, or expiration</li>
              <li>Comply with all applicable federal, state, and local cannabis regulations</li>
              <li>Operate only within jurisdictions where you are properly licensed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Product Legality and Compliance</h2>
            <p className="text-gray-300 mb-4">
              You are solely responsible for ensuring that all products listed on the Platform comply with applicable laws. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Only list products that are legal in your operating jurisdiction</li>
              <li>Ensure all products meet state testing and safety requirements</li>
              <li>Maintain proper product labeling as required by law</li>
              <li>Never list products containing banned substances or adulterants</li>
              <li>Comply with THC/CBD potency limits and serving size regulations</li>
              <li>Verify customer age and eligibility for cannabis purchases</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Accurate Product Listings</h2>
            <p className="text-gray-300 mb-4">
              You agree to provide truthful, accurate, and complete information about all products listed on the Platform, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Product names, descriptions, and strain information</li>
              <li>Accurate THC, CBD, and cannabinoid percentages</li>
              <li>Product weight, quantity, and serving sizes</li>
              <li>Pricing, including all taxes and fees</li>
              <li>Product availability and stock status</li>
              <li>Allergen information and ingredients</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Misleading or fraudulent product listings are strictly prohibited and may result in immediate account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Laboratory Testing and COA Documentation</h2>
            <p className="text-gray-300 mb-4">
              You agree to maintain Certificates of Analysis (COAs) from state-licensed testing laboratories for all products listed on the Platform. You must:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Ensure all products are tested by accredited laboratories</li>
              <li>Maintain current COAs showing potency, contaminants, and safety testing</li>
              <li>Provide COAs to customers upon request</li>
              <li>Upload COAs to the Platform when required</li>
              <li>Remove products from listings if testing results expire or fail compliance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Vendor Advertising Compliance</h2>
            <p className="text-gray-300 mb-4">
              All advertising and marketing conducted through the Platform must comply with cannabis advertising regulations. You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Make unsubstantiated health or medical claims about cannabis products</li>
              <li>Advertise products as treating, curing, or preventing any disease</li>
              <li>Target minors or use imagery appealing to children</li>
              <li>Use testimonials that make medical claims</li>
              <li>Make false or misleading statements about product potency or effects</li>
              <li>Advertise outside of permitted channels or jurisdictions</li>
            </ul>
            <p className="text-gray-300 mt-4">
              See our separate Advertising Policy for complete guidelines on permitted marketing activities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Platform Role and Liability Limitations</h2>
            <p className="text-gray-300 mb-4">
              Da Treehouse operates strictly as a directory and discovery platform connecting cannabis vendors with customers. You acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Da Treehouse does not process payments or handle transactions</li>
              <li>Da Treehouse does not hold, store, or distribute cannabis products</li>
              <li>All sales occur directly between vendor and customer</li>
              <li>Da Treehouse is not responsible for product quality, delivery, or customer disputes</li>
              <li>Da Treehouse does not verify product testing or compliance</li>
              <li>Vendors are solely responsible for order fulfillment and customer service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Subscription and Payment Terms</h2>
            <p className="text-gray-300 mb-4">
              Vendor access to the Platform requires an active paid subscription. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Pay all subscription fees according to your selected plan</li>
              <li>Provide valid payment information for recurring billing</li>
              <li>Authorize automatic charges for subscription renewals</li>
              <li>Notify Da Treehouse of payment method changes or updates</li>
              <li>Pay any applicable taxes on subscription fees</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Failure to maintain payment may result in listing suspension or account termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Account Suspension Rights</h2>
            <p className="text-gray-300 mb-4">
              Da Treehouse reserves the right to suspend or terminate your vendor account at any time for violations of this Agreement, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Operating without proper licenses</li>
              <li>Listing illegal or non-compliant products</li>
              <li>Providing false or misleading information</li>
              <li>Engaging in fraudulent activity</li>
              <li>Violating advertising guidelines</li>
              <li>Receiving excessive customer complaints</li>
              <li>Non-payment of subscription fees</li>
              <li>Violation of community guidelines</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Da Treehouse will make reasonable efforts to provide notice of suspension when possible, but reserves the right to immediately suspend accounts for serious violations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Vendor Indemnification</h2>
            <p className="text-gray-300 mb-4">
              You agree to indemnify, defend, and hold harmless Da Treehouse and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including attorney fees) arising from:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Your violation of this Agreement</li>
              <li>Your violation of applicable laws or regulations</li>
              <li>Product quality, safety, or compliance issues</li>
              <li>Customer disputes or claims related to your products or services</li>
              <li>Your advertising, marketing, or promotional activities</li>
              <li>Intellectual property infringement claims</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Data and Analytics</h2>
            <p className="text-gray-300 mb-4">
              Da Treehouse collects data about vendor performance, customer interactions, and platform usage. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Da Treehouse owns all platform data and analytics</li>
              <li>Aggregated vendor data may be used for platform improvements</li>
              <li>Da Treehouse may display vendor ratings, reviews, and performance metrics</li>
              <li>Vendors receive access to their own performance dashboards and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Intellectual Property</h2>
            <p className="text-gray-300 mb-4">
              You retain ownership of your business name, logo, product images, and content uploaded to the Platform. However, you grant Da Treehouse a non-exclusive license to display, reproduce, and distribute your content for the purpose of operating the Platform.
            </p>
            <p className="text-gray-300">
              You represent that you own or have rights to all content you upload and that it does not infringe on third-party intellectual property rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Modification of Terms</h2>
            <p className="text-gray-300 mb-4">
              Da Treehouse reserves the right to modify this Agreement at any time. Material changes will be communicated to vendors via email and platform notifications. Continued use of the Platform after changes constitutes acceptance of the modified Agreement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">14. Termination</h2>
            <p className="text-gray-300 mb-4">
              Either party may terminate this Agreement at any time:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Vendors may cancel their account through the dashboard settings</li>
              <li>Cancellation does not entitle vendors to refunds for unused subscription time</li>
              <li>Upon termination, vendor listings will be removed from the Platform</li>
              <li>Vendors remain responsible for any outstanding orders or customer obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">15. Governing Law</h2>
            <p className="text-gray-300 mb-4">
              This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">16. Contact Information</h2>
            <p className="text-gray-300 mb-4">
              For questions about this Vendor Agreement, please contact:
            </p>
            <div className="rounded-lg border border-green-900/25 bg-gray-900/50 p-6">
              <p className="text-gray-300 font-medium">Da Treehouse vendor support</p>
              <p className="text-gray-300">Email: support@datreehouse.com</p>
            </div>
          </section>

          <section className="mt-8 rounded-lg border border-green-900/30 bg-green-950/20 p-6">
            <h3 className="text-xl font-bold text-white mb-3">Vendor acknowledgment</h3>
            <p className="text-gray-300">
              By creating a vendor account and accepting this Agreement during onboarding, you acknowledge that you have read, understood, and agree to be bound by all terms and conditions outlined in this Vendor Agreement.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

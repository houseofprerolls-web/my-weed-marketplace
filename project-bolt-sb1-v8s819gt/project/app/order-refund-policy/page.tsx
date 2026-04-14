import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order & Refund Policy | Green Zone",
  description: "Understanding order fulfillment and refund procedures on Green Zone"
};

export default function OrderRefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Order & Refund Policy</h1>
        <p className="text-gray-600 mb-8">Last Updated: March 2026</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600">
            <h2 className="text-xl font-bold mb-3">Important Notice</h2>
            <p className="text-gray-800 font-medium">
              Green Zone operates strictly as a directory and discovery platform. We connect customers with licensed cannabis vendors but do not process payments, hold inventory, or fulfill orders.
            </p>
            <p className="text-gray-800 mt-3">
              All purchases, deliveries, refunds, and customer service occur directly between customers and individual vendors.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">1. Platform Role</h2>
            <p className="text-gray-700 mb-4">
              Green Zone provides a marketplace platform where:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Customers can discover and browse licensed cannabis vendors</li>
              <li>Vendors can showcase their products and services</li>
              <li>Customers and vendors can connect for transactions</li>
            </ul>
            <p className="text-gray-700 mt-4 font-medium">
              Green Zone is NOT involved in the transaction process. We do not:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mt-2">
              <li>Process or handle payments</li>
              <li>Store, possess, or distribute cannabis products</li>
              <li>Fulfill orders or manage deliveries</li>
              <li>Control vendor pricing or inventory</li>
              <li>Provide customer service for individual orders</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. How Orders Work</h2>
            <p className="text-gray-700 mb-4">
              When you place an order through Green Zone:
            </p>
            <ol className="list-decimal pl-6 space-y-3 text-gray-700">
              <li>
                <strong>Browse Products:</strong> You browse vendor listings and products on the Green Zone platform
              </li>
              <li>
                <strong>Contact Vendor:</strong> You contact the vendor directly or place an order through their system
              </li>
              <li>
                <strong>Direct Transaction:</strong> Payment and order details are handled directly between you and the vendor
              </li>
              <li>
                <strong>Vendor Fulfillment:</strong> The vendor processes your payment, prepares your order, and arranges delivery
              </li>
              <li>
                <strong>Delivery:</strong> The vendor delivers your order according to their delivery policies
              </li>
            </ol>
            <p className="text-gray-700 mt-4 italic">
              Green Zone facilitates the connection but is not a party to the transaction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Vendor Responsibility</h2>
            <p className="text-gray-700 mb-4">
              Each vendor on Green Zone is an independent business responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Order Accuracy:</strong> Ensuring orders are complete and accurate</li>
              <li><strong>Product Quality:</strong> Providing products that meet their descriptions and quality standards</li>
              <li><strong>Timely Delivery:</strong> Delivering orders within stated timeframes</li>
              <li><strong>Customer Service:</strong> Responding to customer questions and concerns</li>
              <li><strong>Refund Processing:</strong> Handling refund requests according to their policies</li>
              <li><strong>Legal Compliance:</strong> Operating within all applicable cannabis regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Refunds and Returns</h2>
            <p className="text-gray-700 mb-4">
              Refund and return policies are set by individual vendors, not by Green Zone. Common vendor policies include:
            </p>

            <div className="space-y-4">
              <div className="bg-gray-50 p-5 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Typical Refund Scenarios</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>Wrong Items Delivered:</strong> Vendor typically provides replacement or refund</li>
                  <li><strong>Missing Items:</strong> Vendor usually delivers missing items or issues credit</li>
                  <li><strong>Product Quality Issues:</strong> Vendor may offer replacement, credit, or refund</li>
                  <li><strong>Damaged Products:</strong> Vendor typically replaces or refunds damaged items</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-5 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Non-Refundable Situations</h3>
                <p className="text-gray-700 mb-2">Most vendors do not accept returns or provide refunds for:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Change of mind or buyer's remorse</li>
                  <li>Products that have been opened or consumed</li>
                  <li>Items with intact seals and packaging</li>
                  <li>Personal preference regarding effects or taste</li>
                </ul>
              </div>
            </div>

            <p className="text-gray-700 mt-4">
              <strong>Important:</strong> Always review the vendor's specific refund policy before placing an order. Contact the vendor directly for refund requests.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Delivery Issues</h2>
            <p className="text-gray-700 mb-4">
              If you experience delivery problems, contact the vendor directly:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Late Delivery:</strong> Check estimated delivery time and contact vendor for updates</li>
              <li><strong>Missed Delivery:</strong> Coordinate with vendor to reschedule</li>
              <li><strong>Wrong Address:</strong> Contact vendor immediately to redirect delivery</li>
              <li><strong>Delivery Never Arrived:</strong> Report to vendor for investigation and resolution</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Green Zone is not responsible for delivery delays or fulfillment issues, but vendors may face penalties for consistent delivery problems.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Dispute Resolution</h2>
            <p className="text-gray-700 mb-4">
              If you cannot resolve an issue directly with a vendor:
            </p>
            <ol className="list-decimal pl-6 space-y-3 text-gray-700">
              <li>
                <strong>Document the Issue:</strong> Take photos, save communications, and gather order details
              </li>
              <li>
                <strong>Contact the Vendor:</strong> Attempt to resolve directly with clear, professional communication
              </li>
              <li>
                <strong>Allow Response Time:</strong> Give vendors 24-48 hours to respond during business days
              </li>
              <li>
                <strong>Report to Green Zone:</strong> If unresolved, report the issue through our support system
              </li>
            </ol>

            <div className="bg-yellow-50 p-5 rounded-lg mt-4 border-l-4 border-yellow-600">
              <h3 className="font-bold mb-2">What Green Zone Can Do</h3>
              <p className="text-gray-700 mb-2">While we cannot process refunds directly, we can:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Mediate disputes between customers and vendors</li>
                <li>Review vendor compliance with platform policies</li>
                <li>Take action against vendors with repeated complaints</li>
                <li>Suspend or remove vendors who violate policies</li>
                <li>Help escalate serious issues to appropriate parties</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Payment Methods</h2>
            <p className="text-gray-700 mb-4">
              Vendors set their own accepted payment methods, which may include:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Cash on delivery</li>
              <li>Debit cards</li>
              <li>Digital payment apps (Venmo, Cash App, etc.)</li>
              <li>Cryptocurrency</li>
              <li>Vendor-specific payment systems</li>
            </ul>
            <p className="text-gray-700 mt-4">
              <strong>Payment Disputes:</strong> Contact your payment provider (bank, card issuer, payment app) and the vendor to resolve payment issues. Green Zone does not process or handle payments.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Order Cancellations</h2>
            <p className="text-gray-700 mb-4">
              Cancellation policies vary by vendor:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Before Processing:</strong> Most vendors allow free cancellation before order preparation begins</li>
              <li><strong>After Processing:</strong> Vendors may charge cancellation fees or refuse cancellations</li>
              <li><strong>In Transit:</strong> Orders in delivery usually cannot be canceled</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Contact the vendor immediately if you need to cancel an order. Cancellation requests through Green Zone cannot stop orders in progress.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Product Quality Concerns</h2>
            <p className="text-gray-700 mb-4">
              If you receive products with quality issues:
            </p>
            <ol className="list-decimal pl-6 space-y-3 text-gray-700">
              <li>Document the issue with clear photos before opening or consuming</li>
              <li>Contact the vendor immediately with details and documentation</li>
              <li>Request the vendor's Certificate of Analysis (COA) if quality is in question</li>
              <li>Report serious safety concerns to Green Zone and appropriate regulatory authorities</li>
            </ol>
            <p className="text-gray-700 mt-4">
              Green Zone takes product safety seriously. Vendors with repeated quality complaints may face account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Age Verification and Legal Compliance</h2>
            <p className="text-gray-700 mb-4">
              All orders require:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Valid government-issued ID showing you are 21+</li>
              <li>ID verification at time of delivery</li>
              <li>Compliance with local cannabis possession limits</li>
            </ul>
            <p className="text-gray-700 mt-4">
              <strong>No Refunds for Failed Verification:</strong> Orders canceled due to failed ID verification or legal compliance issues are not eligible for refunds.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Vendor Reviews and Ratings</h2>
            <p className="text-gray-700 mb-4">
              Help the community by leaving honest reviews:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Rate your experience with product quality, delivery, and service</li>
              <li>Provide specific feedback to help other customers</li>
              <li>Report serious issues through proper channels, not just reviews</li>
              <li>Update reviews if vendors successfully resolve issues</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Vendor ratings help maintain platform quality and guide other customers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              For vendor-specific order issues, contact the vendor directly using their profile contact information.
            </p>
            <p className="text-gray-700 mb-4">
              To report serious platform issues or unresolved vendor disputes:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700 font-medium">Green Zone Customer Support</p>
              <p className="text-gray-700">Email: support@greenzone.com</p>
              <p className="text-gray-700">Phone: 1-800-GREEN-ZONE</p>
              <p className="text-gray-700 mt-3 text-sm italic">
                Note: Support can assist with platform issues but cannot process refunds or resolve vendor-specific order problems directly.
              </p>
            </div>
          </section>

          <section className="bg-green-50 p-6 rounded-lg mt-8">
            <h3 className="text-xl font-bold mb-3">Your Rights as a Customer</h3>
            <p className="text-gray-700 mb-3">
              While Green Zone is not directly involved in transactions, we are committed to maintaining a safe, reliable marketplace. You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Accurate product information and honest vendor representations</li>
              <li>Safe, compliant products from licensed vendors</li>
              <li>Professional customer service from vendors</li>
              <li>Fair treatment and resolution of legitimate complaints</li>
              <li>Report vendors who violate platform policies</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ShoppingCart, Package, Shield } from 'lucide-react';
import { SITE_NAME } from '@/lib/brand';

export const metadata = {
  title: `Help Center | ${SITE_NAME}`,
  description: `Get help and find answers to common questions about ${SITE_NAME}`,
};

export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 text-gray-200">
        <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-white mb-4">How can we help you?</h1>
            <p className="text-gray-400 mb-8">Find answers to common questions and learn how to use {SITE_NAME}</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="border-green-900/25 bg-gradient-to-br from-gray-900 to-black p-6 text-center transition-shadow hover:ring-1 hover:ring-green-700/30">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-brand-lime" />
              <h3 className="font-semibold text-white mb-2">Ordering</h3>
              <p className="text-sm text-gray-400">Learn how to browse products and place orders</p>
            </Card>
            <Card className="border-green-900/25 bg-gradient-to-br from-gray-900 to-black p-6 text-center transition-shadow hover:ring-1 hover:ring-green-700/30">
              <Package className="h-12 w-12 mx-auto mb-4 text-brand-lime" />
              <h3 className="font-semibold text-white mb-2">Delivery</h3>
              <p className="text-sm text-gray-400">Track orders and understand delivery options</p>
            </Card>
            <Card className="border-green-900/25 bg-gradient-to-br from-gray-900 to-black p-6 text-center transition-shadow hover:ring-1 hover:ring-green-700/30">
              <Shield className="h-12 w-12 mx-auto mb-4 text-brand-lime" />
              <h3 className="font-semibold text-white mb-2">Safety</h3>
              <p className="text-sm text-gray-400">ID verification and secure transactions</p>
            </Card>
          </div>

          <h2 className="text-2xl font-bold text-white mb-6">Frequently asked questions</h2>

          <Accordion type="single" collapsible className="space-y-2">
            <AccordionItem
              value="item-1"
              className="rounded-lg border border-green-900/25 bg-gray-900/40 px-4"
            >
              <AccordionTrigger className="text-left text-white hover:text-brand-lime-soft hover:no-underline">
                How do I create an account?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                Click the &quot;Sign Up&quot; button in the top right corner, enter your email and create a password. You
                must be 21 or older to create an account.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-2"
              className="rounded-lg border border-green-900/25 bg-gray-900/40 px-4"
            >
              <AccordionTrigger className="text-left text-white hover:text-brand-lime-soft hover:no-underline">
                Why do I need to upload my ID?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                We are legally required to verify that all customers are 21 or older. Your ID is encrypted and stored
                securely, and only used for age verification purposes.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-3"
              className="rounded-lg border border-green-900/25 bg-gray-900/40 px-4"
            >
              <AccordionTrigger className="text-left text-white hover:text-brand-lime-soft hover:no-underline">
                How do I place an order?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                Browse vendors and products, add items to your cart, proceed to checkout, upload your ID (if you
                haven&apos;t already), enter your delivery address, and confirm your order.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-4"
              className="rounded-lg border border-green-900/25 bg-gray-900/40 px-4"
            >
              <AccordionTrigger className="text-left text-white hover:text-brand-lime-soft hover:no-underline">
                How long does delivery take?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                Delivery times vary by vendor and location. Most deliveries are completed within 1-2 hours. You can
                track your order status in real-time from your account.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-5"
              className="rounded-lg border border-green-900/25 bg-gray-900/40 px-4"
            >
              <AccordionTrigger className="text-left text-white hover:text-brand-lime-soft hover:no-underline">
                What payment methods do you accept?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                Accepted payment methods vary by vendor. Most accept cash, debit cards, and some accept credit cards.
                Payment details are shown during checkout.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-6"
              className="rounded-lg border border-green-900/25 bg-gray-900/40 px-4"
            >
              <AccordionTrigger className="text-left text-white hover:text-brand-lime-soft hover:no-underline">
                Can I cancel or modify my order?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                You may be able to cancel your order before the vendor begins preparing it. Contact the vendor directly
                through your order page or reach out to our support team.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-7"
              className="rounded-lg border border-green-900/25 bg-gray-900/40 px-4"
            >
              <AccordionTrigger className="text-left text-white hover:text-brand-lime-soft hover:no-underline">
                What if my order is wrong or damaged?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                Contact the vendor immediately through your order page. Most vendors will replace or refund incorrect
                or damaged items. You can also file a report through our platform.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-8"
              className="rounded-lg border border-green-900/25 bg-gray-900/40 px-4"
            >
              <AccordionTrigger className="text-left text-white hover:text-brand-lime-soft hover:no-underline">
                How do I leave a review?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                After your order is delivered, you&apos;ll be able to leave a review on the vendor&apos;s page and rate
                individual products. Honest reviews help the community!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-9"
              className="rounded-lg border border-green-900/25 bg-gray-900/40 px-4"
            >
              <AccordionTrigger className="text-left text-white hover:text-brand-lime-soft hover:no-underline">
                Is my information secure?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                Yes. We use industry-standard encryption and security measures to protect your personal information and ID
                documents. Read our Privacy Policy for more details.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-10"
              className="rounded-lg border border-green-900/25 bg-gray-900/40 px-4"
            >
              <AccordionTrigger className="text-left text-white hover:text-brand-lime-soft hover:no-underline">
                How do I become a vendor on {SITE_NAME}?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                Visit our &quot;List Your Business&quot; page to learn about our vendor program. You&apos;ll need a valid
                business license and to complete our vendor onboarding process.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-12 rounded-xl border border-green-900/30 bg-gradient-to-br from-green-950/30 to-gray-950 p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Still need help?</h3>
            <p className="text-gray-400 mb-6">Our support team is here to assist you</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@datreehouse.com"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-brand-red text-white hover:bg-brand-red-deep transition-colors"
              >
                Email support
              </a>
              <a
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg border-2 border-brand-lime/50 text-brand-lime hover:bg-green-950/50 transition-colors"
              >
                Contact us
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, ShoppingCart, Package, CreditCard, Shield, Users } from 'lucide-react';

export const metadata = {
  title: 'Help Center | GreenZone',
  description: 'Get help and find answers to common questions about GreenZone',
};

export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="bg-gradient-to-b from-green-50 to-white py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
            <p className="text-gray-600 mb-8">
              Find answers to common questions and learn how to use GreenZone
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="font-semibold mb-2">Ordering</h3>
              <p className="text-sm text-gray-600">
                Learn how to browse products and place orders
              </p>
            </Card>
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <Package className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="font-semibold mb-2">Delivery</h3>
              <p className="text-sm text-gray-600">
                Track orders and understand delivery options
              </p>
            </Card>
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <Shield className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="font-semibold mb-2">Safety</h3>
              <p className="text-sm text-gray-600">
                ID verification and secure transactions
              </p>
            </Card>
          </div>

          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left">
                How do I create an account?
              </AccordionTrigger>
              <AccordionContent>
                Click the &quot;Sign Up&quot; button in the top right corner, enter your email and create a password. You must be 21 or older to create an account.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">
                Why do I need to upload my ID?
              </AccordionTrigger>
              <AccordionContent>
                We are legally required to verify that all customers are 21 or older. Your ID is encrypted and stored securely, and only used for age verification purposes.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">
                How do I place an order?
              </AccordionTrigger>
              <AccordionContent>
                Browse vendors and products, add items to your cart, proceed to checkout, upload your ID (if you haven&apos;t already), enter your delivery address, and confirm your order.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left">
                How long does delivery take?
              </AccordionTrigger>
              <AccordionContent>
                Delivery times vary by vendor and location. Most deliveries are completed within 1-2 hours. You can track your order status in real-time from your account.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left">
                What payment methods do you accept?
              </AccordionTrigger>
              <AccordionContent>
                Accepted payment methods vary by vendor. Most accept cash, debit cards, and some accept credit cards. Payment details are shown during checkout.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-left">
                Can I cancel or modify my order?
              </AccordionTrigger>
              <AccordionContent>
                You may be able to cancel your order before the vendor begins preparing it. Contact the vendor directly through your order page or reach out to our support team.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger className="text-left">
                What if my order is wrong or damaged?
              </AccordionTrigger>
              <AccordionContent>
                Contact the vendor immediately through your order page. Most vendors will replace or refund incorrect or damaged items. You can also file a report through our platform.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger className="text-left">
                How do I leave a review?
              </AccordionTrigger>
              <AccordionContent>
                After your order is delivered, you&apos;ll be able to leave a review on the vendor&apos;s page and rate individual products. Honest reviews help the community!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-9">
              <AccordionTrigger className="text-left">
                Is my information secure?
              </AccordionTrigger>
              <AccordionContent>
                Yes. We use industry-standard encryption and security measures to protect your personal information and ID documents. Read our Privacy Policy for more details.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-10">
              <AccordionTrigger className="text-left">
                How do I become a vendor on GreenZone?
              </AccordionTrigger>
              <AccordionContent>
                Visit our &quot;List Your Business&quot; page to learn about our vendor program. You&apos;ll need a valid business license and to complete our vendor onboarding process.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-12 p-8 bg-green-50 rounded-lg text-center">
            <h3 className="text-2xl font-bold mb-4">Still need help?</h3>
            <p className="text-gray-600 mb-6">
              Our support team is here to assist you
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@greenzone.com"
                className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Email Support
              </a>
              <a
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 bg-white border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

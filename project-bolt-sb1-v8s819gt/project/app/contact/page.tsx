import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';

export const metadata = {
  title: 'Contact Us | GreenZone',
  description: 'Get in touch with the GreenZone team',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="bg-gradient-to-b from-green-50 to-white py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-gray-600">
              Have a question or need assistance? We&apos;re here to help.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="p-6 text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="font-semibold mb-2">Email Us</h3>
              <p className="text-sm text-gray-600 mb-2">
                For general inquiries
              </p>
              <a href="mailto:support@greenzone.com" className="text-green-600 hover:underline">
                support@greenzone.com
              </a>
            </Card>

            <Card className="p-6 text-center">
              <Phone className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="font-semibold mb-2">Call Us</h3>
              <p className="text-sm text-gray-600 mb-2">
                Monday - Friday, 9am - 6pm
              </p>
              <a href="tel:1-800-XXX-XXXX" className="text-green-600 hover:underline">
                1-800-XXX-XXXX
              </a>
            </Card>

            <Card className="p-6 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="font-semibold mb-2">Help Center</h3>
              <p className="text-sm text-gray-600 mb-2">
                Find answers to common questions
              </p>
              <a href="/help" className="text-green-600 hover:underline">
                Visit Help Center
              </a>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
              <form className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your name" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="How can we help?" />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us more about your inquiry..."
                    rows={6}
                  />
                </div>
                <Button className="w-full" size="lg">
                  Send Message
                </Button>
              </form>
            </Card>

            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Customer Support</h3>
                <p className="text-sm text-gray-600 mb-4">
                  For order-related questions, login issues, or general platform support
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> support@greenzone.com</p>
                  <p><strong>Hours:</strong> Monday - Friday, 9am - 6pm PST</p>
                  <p><strong>Response Time:</strong> Within 24 hours</p>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">Vendor Support</h3>
                <p className="text-sm text-gray-600 mb-4">
                  For vendors needing assistance with their accounts, menus, or orders
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> vendors@greenzone.com</p>
                  <p><strong>Hours:</strong> Monday - Friday, 8am - 8pm PST</p>
                  <p><strong>Response Time:</strong> Within 12 hours</p>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">Business Inquiries</h3>
                <p className="text-sm text-gray-600 mb-4">
                  For partnerships, media inquiries, or business development
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> business@greenzone.com</p>
                  <p><strong>Hours:</strong> Monday - Friday, 9am - 5pm PST</p>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">Legal & Compliance</h3>
                <p className="text-sm text-gray-600 mb-4">
                  For legal matters, compliance questions, or privacy concerns
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> legal@greenzone.com</p>
                </div>
              </Card>
            </div>
          </div>

          <div className="mt-12 p-8 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-bold mb-4 text-center">Office Location</h3>
            <div className="flex items-start gap-4 justify-center">
              <MapPin className="h-6 w-6 text-green-600 mt-1" />
              <div>
                <p className="font-semibold">GreenZone Headquarters</p>
                <p className="text-gray-600">123 Cannabis Street</p>
                <p className="text-gray-600">San Francisco, CA 94102</p>
                <p className="text-gray-600">United States</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

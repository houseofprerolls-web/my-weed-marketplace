import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Mail, MessageCircle, Clock } from 'lucide-react';
import { ContactMessageForm } from '@/components/contact/ContactMessageForm';
import { SITE_NAME } from '@/lib/brand';

export const metadata = {
  title: `Contact | ${SITE_NAME}`,
  description: `Get in touch with the ${SITE_NAME} team`,
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 text-gray-200">
        <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Contact us</h1>
            <p className="text-gray-400">Have a question or need assistance? We&apos;re here to help.</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="border-green-900/25 bg-gradient-to-br from-gray-900 to-black p-6 text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 text-brand-lime" />
              <h3 className="font-semibold text-white mb-2">Email</h3>
              <p className="text-sm text-gray-400 mb-2">General inquiries</p>
              <a href="mailto:support@datreehouse.com" className="text-green-400 hover:text-brand-lime-soft hover:underline">
                support@datreehouse.com
              </a>
            </Card>

            <Card className="border-green-900/25 bg-gradient-to-br from-gray-900 to-black p-6 text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 text-brand-lime" />
              <h3 className="font-semibold text-white mb-2">Hours</h3>
              <p className="text-sm text-gray-400 mb-2">We reply by email</p>
              <p className="text-sm text-gray-300">Monday – Friday, 9am – 6pm PT</p>
            </Card>

            <Card className="border-green-900/25 bg-gradient-to-br from-gray-900 to-black p-6 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-brand-lime" />
              <h3 className="font-semibold text-white mb-2">Help center</h3>
              <p className="text-sm text-gray-400 mb-2">Common questions</p>
              <Link href="/help" className="text-green-400 hover:text-brand-lime-soft hover:underline">
                Visit help center
              </Link>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-green-900/25 bg-gray-900/50 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Send us a message</h2>
              <ContactMessageForm />
            </Card>

            <div className="space-y-6">
              <Card className="border-green-900/25 bg-gray-900/50 p-6">
                <h3 className="font-semibold text-white mb-4">Customer support</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Orders, login, and general platform questions
                </p>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>
                    <strong className="text-white">Email:</strong>{' '}
                    <a href="mailto:support@datreehouse.com" className="text-green-400 hover:underline">
                      support@datreehouse.com
                    </a>
                  </p>
                  <p>
                    <strong className="text-white">Hours:</strong> Monday – Friday, 9am – 6pm PT
                  </p>
                  <p>
                    <strong className="text-white">Typical reply:</strong> within 24 hours
                  </p>
                </div>
              </Card>

              <Card className="border-green-900/25 bg-gray-900/50 p-6">
                <h3 className="font-semibold text-white mb-4">Vendor support</h3>
                <p className="text-sm text-gray-400 mb-4">Accounts, menus, listings, and partner tools</p>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>
                    <strong className="text-white">Email:</strong>{' '}
                    <a href="mailto:vendors@datreehouse.com" className="text-green-400 hover:underline">
                      vendors@datreehouse.com
                    </a>
                  </p>
                  <p>
                    <strong className="text-white">Hours:</strong> Monday – Friday, 8am – 8pm PT
                  </p>
                </div>
              </Card>

              <Card className="border-green-900/25 bg-gray-900/50 p-6">
                <h3 className="font-semibold text-white mb-4">Business &amp; media</h3>
                <p className="text-sm text-gray-400 mb-4">Partnerships and press</p>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>
                    <strong className="text-white">Email:</strong>{' '}
                    <a href="mailto:partners@datreehouse.com" className="text-green-400 hover:underline">
                      partners@datreehouse.com
                    </a>
                  </p>
                </div>
              </Card>

              <Card className="border-green-900/25 bg-gray-900/50 p-6">
                <h3 className="font-semibold text-white mb-4">Legal &amp; privacy</h3>
                <p className="text-sm text-gray-400 mb-4">Compliance and privacy requests</p>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>
                    <strong className="text-white">Email:</strong>{' '}
                    <a href="mailto:legal@datreehouse.com" className="text-green-400 hover:underline">
                      legal@datreehouse.com
                    </a>
                  </p>
                </div>
              </Card>
            </div>
          </div>

          <div className="mt-12 rounded-xl border border-green-900/25 bg-gray-900/40 p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-3">Postal mail</h3>
            <p className="mx-auto max-w-lg text-sm text-gray-400">
              We handle almost everything by email. If you need a physical mailing address (legal or privacy requests),
              write to{' '}
              <a href="mailto:legal@datreehouse.com" className="text-green-400 hover:underline">
                legal@datreehouse.com
              </a>{' '}
              or{' '}
              <a href="mailto:privacy@datreehouse.com" className="text-green-400 hover:underline">
                privacy@datreehouse.com
              </a>{' '}
              and we will provide it.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

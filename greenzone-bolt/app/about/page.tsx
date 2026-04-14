import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Leaf, MapPin, Users, Shield } from 'lucide-react';
import { SITE_NAME } from '@/lib/brand';

export const metadata = {
  title: `About | ${SITE_NAME}`,
  description: `${SITE_NAME} — cannabis discovery, menus, deals, and community.`,
};

const pillars = [
  {
    icon: Leaf,
    title: 'Quality products',
    body: 'Connect with verified dispensaries and delivery services offering compliant cannabis products.',
  },
  {
    icon: MapPin,
    title: 'Local discovery',
    body: 'Find shops and services in your area with maps, menus, and clear availability signals.',
  },
  {
    icon: Users,
    title: 'Community driven',
    body: 'Reviews and ratings from people who actually shop — not anonymous noise.',
  },
  {
    icon: Shield,
    title: 'Built for trust',
    body: 'Age gates, verification flows where required, and security practices that match what you expect from a marketplace.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/35 to-black py-14">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-lime-soft">About</p>
          <h1 className="mt-3 text-4xl font-bold md:text-5xl">About {SITE_NAME}</h1>
          <p className="mt-4 text-lg text-gray-400">
            Your hub for cannabis discovery — dispensaries, delivery, menus, deals, and strain info in one place.
          </p>
          <Button asChild className="mt-8 bg-brand-red hover:bg-brand-red-deep">
            <Link href="/discover">Browse vendors</Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <Card className="mb-10 border-green-900/25 bg-gradient-to-br from-gray-900 to-black p-8">
          <p className="mb-6 text-lg leading-relaxed text-gray-300">
            {SITE_NAME} helps adults 21+ find licensed dispensaries and delivery services, compare menus, spot deals, and
            learn about strains — without juggling a dozen bookmarked sites.
          </p>
          <p className="mb-6 text-lg leading-relaxed text-gray-300">
            Vendors control their own storefronts, pricing, and fulfillment. We focus on discovery, clarity, and tools
            that make shopping and selling simpler.
          </p>
          <p className="text-lg leading-relaxed text-gray-300">
            Our mission is straightforward: make legal cannabis discovery transparent, respectful of local rules, and
            useful for real shoppers and real businesses.
          </p>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {pillars.map(({ icon: Icon, title, body }) => (
            <Card
              key={title}
              className="border-green-900/25 bg-gradient-to-br from-gray-900/90 to-black p-6 transition-shadow hover:ring-1 hover:ring-green-800/30"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-green-600/15 p-3">
                  <Icon className="h-7 w-7 text-brand-lime-soft" />
                </div>
                <h2 className="text-xl font-semibold text-white">{title}</h2>
              </div>
              <p className="text-gray-400">{body}</p>
            </Card>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-gray-500">
          Questions?{' '}
          <Link href="/contact" className="text-brand-lime-soft hover:text-white hover:underline">
            Contact us
          </Link>{' '}
          or see the{' '}
          <Link href="/help" className="text-brand-lime-soft hover:text-white hover:underline">
            help center
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

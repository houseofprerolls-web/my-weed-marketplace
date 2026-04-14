import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/brand';
import { Card } from '@/components/ui/card';

const title = `Guides | ${SITE_NAME}`;
const description = `Practical cannabis shopping guides — delivery basics, lab reports, and how to use ${SITE_NAME} with confidence.`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: 'website' },
  robots: { index: true, follow: true },
};

const guides = [
  {
    href: '/guides/how-cannabis-delivery-works',
    title: 'How cannabis delivery usually works',
    blurb: 'ZIP checks, IDs at the door, and what to expect from compliant marketplaces.',
  },
  {
    href: '/guides/how-to-read-a-coa',
    title: 'How to read a COA (certificate of analysis)',
    blurb: 'A short primer on potency, contaminants, and batch labels before you buy.',
  },
];

export default function GuidesIndexPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-green-900/25 bg-gradient-to-b from-green-950/40 to-black">
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-lime-soft">Guides</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Learn before you shop</h1>
          <p className="mt-3 max-w-2xl text-gray-400">{description}</p>
        </div>
      </div>
      <div className="container mx-auto max-w-3xl space-y-4 px-4 py-10">
        {guides.map((g) => (
          <Card
            key={g.href}
            className="border-green-900/30 bg-gradient-to-br from-gray-900 to-black p-6 transition hover:border-green-600/40"
          >
            <Link href={g.href} className="block">
              <h2 className="text-xl font-semibold text-white hover:text-brand-lime-soft">{g.title}</h2>
              <p className="mt-2 text-sm text-gray-400">{g.blurb}</p>
              <span className="mt-3 inline-block text-sm font-medium text-green-400">Read guide →</span>
            </Link>
          </Card>
        ))}
        <p className="pt-4 text-center text-sm text-gray-500">
          Ready to browse?{' '}
          <Link href="/discover" className="text-green-400 hover:underline">
            Open Discover
          </Link>{' '}
          or{' '}
          <Link href="/vendor/onboarding" className="text-green-400 hover:underline">
            list your business
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

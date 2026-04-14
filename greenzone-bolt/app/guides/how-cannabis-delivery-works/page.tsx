import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/brand';

const title = `How cannabis delivery works | ${SITE_NAME}`;
const description =
  'What compliant delivery looks like: age verification, local rules, order cutoffs, and how marketplaces like DaTreehouse fit in.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: 'article' },
  robots: { index: true, follow: true },
};

export default function HowDeliveryWorksGuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-gray-300 md:px-6">
        <p className="text-sm text-gray-500">
          <Link href="/guides" className="text-green-400 hover:underline">
            ← All guides
          </Link>
        </p>
        <h1 className="mt-4 text-3xl font-bold text-white">How cannabis delivery usually works</h1>
        <p>
          Legal cannabis delivery depends on your state and city. In most compliant programs, the same rules that apply
          inside a dispensary apply at your door: <strong className="text-gray-200">21+ verification</strong>,{' '}
          <strong className="text-gray-200">purchase limits</strong>, and{' '}
          <strong className="text-gray-200">licensed operators</strong> fulfilling orders.
        </p>
        <h2 className="pt-2 text-xl font-semibold text-white">What you typically need</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>A valid government-issued ID that matches the name on the order.</li>
          <li>An address inside the retailer&apos;s licensed service area (often checked by ZIP).</li>
          <li>Payment methods allowed in your market (cash, debit, or licensed digital options).</li>
        </ul>
        <h2 className="pt-2 text-xl font-semibold text-white">How {SITE_NAME} fits in</h2>
        <p>
          {SITE_NAME} helps you <Link href="/discover">discover licensed menus</Link>, compare deals, and place orders
          where retailers have enabled online checkout. Fulfillment, compliance, and final ID checks are handled by the
          licensed store or its delivery partner—not by the marketplace alone.
        </p>
        <h2 className="pt-2 text-xl font-semibold text-white">Related</h2>
        <ul className="list-disc space-y-2 pl-6 text-green-400">
          <li>
            <Link href="/discover" className="hover:underline">
              Browse shops on Discover
            </Link>
          </li>
          <li>
            <Link href="/map" className="hover:underline">
              Find stores on the map
            </Link>
          </li>
          <li>
            <Link href="/vendor/onboarding" className="hover:underline">
              List your licensed business
            </Link>
          </li>
        </ul>
      </article>
    </div>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/brand';

const title = `How to read a cannabis COA | ${SITE_NAME}`;
const description =
  'Understand potency (THC/CBD), batch IDs, and safety panels on a certificate of analysis before you add to cart.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: 'article' },
  robots: { index: true, follow: true },
};

export default function HowToReadCoaGuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-gray-300 md:px-6">
        <p className="text-sm text-gray-500">
          <Link href="/guides" className="text-green-400 hover:underline">
            ← All guides
          </Link>
        </p>
        <h1 className="mt-4 text-3xl font-bold text-white">How to read a COA (certificate of analysis)</h1>
        <p>
          A COA is a lab report for a specific batch of product. It&apos;s the clearest signal of what&apos;s in the
          package—beyond marketing names or strain hype.
        </p>
        <h2 className="pt-2 text-xl font-semibold text-white">Potency</h2>
        <p>
          Look for <strong className="text-gray-200">total THC</strong> and{' '}
          <strong className="text-gray-200">total CBD</strong> (not only THCA/CBDA). Labs usually report per serving and
          per package; match that to how you consume.
        </p>
        <h2 className="pt-2 text-xl font-semibold text-white">Batch / lot ID</h2>
        <p>
          The COA should tie to a <strong className="text-gray-200">batch or lot number</strong> printed on the label.
          If the numbers don&apos;t match, ask the retailer for the correct report.
        </p>
        <h2 className="pt-2 text-xl font-semibold text-white">Safety panels</h2>
        <p>
          Depending on your state, labs screen for pesticides, heavy metals, microbials, solvents, and more. A
          &quot;pass&quot; under regulated limits is what you want to see for each required category.
        </p>
        <h2 className="pt-2 text-xl font-semibold text-white">Shop with context on {SITE_NAME}</h2>
        <p>
          Use{' '}
          <Link href="/discover" className="text-green-400 hover:underline">
            Discover
          </Link>{' '}
          to compare menus and{' '}
          <Link href="/strains" className="text-green-400 hover:underline">
            strain pages
          </Link>{' '}
          to dig deeper—then confirm packaging and batch details with the retailer at pickup or delivery.
        </p>
      </article>
    </div>
  );
}

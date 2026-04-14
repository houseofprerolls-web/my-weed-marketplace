import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SITE_NAME } from '@/lib/brand';
import {
  DATREEHOUSE_LOGO_PX_HEIGHT,
  DATREEHOUSE_LOGO_PX_WIDTH,
  TREEHOUSE_CAROUSEL_LOGO_URL,
} from '@/lib/treehouseCarouselAsset';
import { MapPin, ShoppingBag, Truck, CircleCheck, ShieldCheck, Timer, MessageCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: `How it works | ${SITE_NAME}`,
  description: `Learn how ${SITE_NAME} connects you with licensed cannabis retailers for menu browsing, checkout, and delivery or pickup, according to each store's policies.`,
};

const steps = [
  {
    icon: MapPin,
    title: 'Choose a licensed retailer',
    body: `Use Discover or the map to browse menus and select a licensed dispensary or delivery service in your area. ${SITE_NAME} helps you find and compare retailers; the sale is completed with the retailer you choose.`,
  },
  {
    icon: ShoppingBag,
    title: 'Build your order',
    body: 'Add products to your cart. Product availability, pricing, taxes, and purchase limits are determined by the retailer and may change before checkout is finalized.',
  },
  {
    icon: Truck,
    title: 'Delivery or pickup',
    body: 'The retailer prepares your order and coordinates delivery or scheduled pickup, according to their operations and applicable regulations. Time estimates vary by location, traffic, and order volume.',
  },
  {
    icon: CircleCheck,
    title: 'Receive your order',
    body: 'For adult-use orders, a valid government-issued photo ID is typically required at delivery or pickup, as specified by the retailer and applicable law. Optional tipping and ratings are offered where the retailer enables them.',
  },
];

const notes = [
  {
    icon: ShieldCheck,
    title: 'Licensed retailers',
    body: `${SITE_NAME} is designed to surface licensed operators. You should verify licensing and menu details on the retailer's own materials when making a purchasing decision.`,
  },
  {
    icon: Timer,
    title: 'Estimates, not guarantees',
    body: `Quoted wait times and delivery windows are provided by retailers and carriers and are not guaranteed by the platform. Check the retailer's communications at checkout for the most current information.`,
  },
  {
    icon: MessageCircle,
    title: 'Support with the retailer first',
    body: `For order changes, refunds, or delivery issues, contact the retailer's customer support through your order or their published channels. They issue the transaction and can resolve fulfillment questions directly.`,
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="border-b border-brand-red/20 bg-gradient-to-b from-zinc-900 via-black to-zinc-950">
        <div className="container mx-auto max-w-3xl px-4 py-14 md:py-20">
          <div className="flex flex-col items-center gap-8 text-center">
            <Image
              src={TREEHOUSE_CAROUSEL_LOGO_URL}
              alt={`${SITE_NAME} logo`}
              width={DATREEHOUSE_LOGO_PX_WIDTH}
              height={DATREEHOUSE_LOGO_PX_HEIGHT}
              className="h-16 w-auto object-contain md:h-[4.5rem]"
              priority
            />
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-lime/90">Da Treehouse</p>
              <h1 className="text-balance text-3xl font-bold tracking-tight text-white md:text-5xl">
                How it works
              </h1>
              <p className="text-pretty text-lg leading-relaxed text-zinc-400 md:text-xl">
                {`${SITE_NAME} connects adult customers with licensed cannabis retailers for online menu browsing and ordering. Fulfillment, compliance, and customer service for each purchase are handled by the retailer you select—not by ${SITE_NAME} as the seller of record.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-14 md:py-16">
        <p className="mb-10 text-center text-sm text-zinc-500 md:text-base">
          The process below is summarized for convenience. Retailer-specific terms, fees, and policies apply at checkout.
        </p>

        <ol className="mb-20 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <Card className="h-full border border-white/10 bg-zinc-900/40 p-6 text-left shadow-none backdrop-blur-sm transition hover:border-brand-red/30">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="font-mono text-2xl font-bold tabular-nums text-brand-red/90">{i + 1}</span>
                    <span className="rounded-lg bg-brand-lime/10 p-2 text-brand-lime">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                  </div>
                  <h2 className="mb-2 text-lg font-semibold text-white">{step.title}</h2>
                  <p className="text-sm leading-relaxed text-zinc-400">{step.body}</p>
                </Card>
              </li>
            );
          })}
        </ol>

        <div className="mb-20">
          <h2 className="mb-2 text-center text-2xl font-bold text-white md:text-3xl">What to expect</h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-sm text-zinc-500">
            A few points customers and partners ask about most often.
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {notes.map((n) => {
              const Icon = n.icon;
              return (
                <Card
                  key={n.title}
                  className="border border-white/10 bg-black/40 p-6 text-left shadow-none md:min-h-[11rem]"
                >
                  <Icon className="mb-3 h-6 w-6 text-brand-lime" aria-hidden />
                  <h3 className="mb-2 font-semibold text-white">{n.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-400">{n.body}</p>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="mb-16 border border-white/10 bg-zinc-900/30 p-8 md:p-10">
          <h2 className="mb-8 text-center text-xl font-bold text-white md:text-2xl">Frequently asked questions</h2>
          <div className="mx-auto max-w-2xl space-y-8">
            <div>
              <h3 className="mb-2 font-semibold text-brand-lime-soft">Is there a minimum age?</h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                Adult-use cannabis purchases require that you meet the minimum age set by the retailer and applicable state
                and local law (often 21 or older in adult-use markets). A valid government-issued photo ID is required at
                delivery or pickup when the retailer specifies it. No valid ID, no release of product.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-brand-lime-soft">How long will delivery take?</h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                Delivery and pickup timing depend on the retailer, your location, traffic, and order volume. Estimates shown
                at checkout are provided by the retailer or their logistics partner and are not guaranteed by {SITE_NAME}.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-brand-lime-soft">Which payment methods are accepted?</h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {`Payment options vary by retailer and may include cash, debit, or other methods permitted in that jurisdiction. Review the retailer's checkout page for accepted methods, fees, and any minimums.`}
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-brand-lime-soft">How are deliveries presented?</h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {`Licensed retailers generally use discreet, professional packaging and handoffs. If you have specific delivery instructions, enter them where the retailer's checkout or driver notes allow.`}
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-brand-lime-soft">Who do I contact about a problem with my order?</h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {`Contact the retailer's customer support first for substitutions, refunds, or delivery issues. They process the sale and are best positioned to resolve fulfillment. For account or platform questions unrelated to a specific retailer's order, see `}
                <Link href="/help" className="text-brand-lime-soft underline-offset-2 hover:underline">
                  Help
                </Link>
                {` or the contact options in the site footer.`}
              </p>
            </div>
          </div>
        </Card>

        <p className="mx-auto mb-12 max-w-3xl text-center text-xs leading-relaxed text-zinc-500">
          {`${SITE_NAME} provides discovery and ordering tools. It does not provide medical advice. Cannabis laws vary by jurisdiction; you are responsible for compliance with the laws that apply to you. Product descriptions and availability are supplied by retailers and may change without notice. `}
          <Link href="/compliance" className="text-brand-lime/90 underline-offset-2 hover:underline">
            Compliance disclosures
          </Link>
          {` for listings, deliveries, and state-legal markets.`}
        </p>

        <div className="text-center">
          <h2 className="mb-3 text-2xl font-bold text-white md:text-3xl">Browse licensed retailers</h2>
          <p className="mx-auto mb-8 max-w-md text-zinc-400">
            {`Continue to Discover to view menus, deals, and service options available in your area.`}
          </p>
          <Link href="/discover">
            <Button size="lg" className="bg-brand-red px-8 py-6 text-base font-semibold text-white hover:bg-brand-red-deep">
              Open Discover
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/brand';
import {
  DATREEHOUSE_LOGO_PX_HEIGHT,
  DATREEHOUSE_LOGO_PX_WIDTH,
  TREEHOUSE_CAROUSEL_LOGO_URL,
} from '@/lib/treehouseCarouselAsset';

export const metadata: Metadata = {
  title: `Compliance disclosures | ${SITE_NAME}`,
  description: `How ${SITE_NAME} lists storefronts and delivery services, platform versus retailer responsibilities, and compliance expectations across state-authorized U.S. cannabis markets.`,
  robots: { index: true, follow: true },
};

export default function CompliancePage() {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <main className="flex-1 text-gray-200">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="mb-8 flex flex-col items-center gap-4 border-b border-white/10 pb-8 text-center md:flex-row md:items-center md:text-left">
            <Image
              src={TREEHOUSE_CAROUSEL_LOGO_URL}
              alt={`${SITE_NAME} logo`}
              width={DATREEHOUSE_LOGO_PX_WIDTH}
              height={DATREEHOUSE_LOGO_PX_HEIGHT}
              className="h-14 w-auto shrink-0 object-contain"
              priority
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-lime/90">Da Treehouse</p>
              <h1 className="text-3xl font-bold text-white md:text-4xl">Compliance &amp; legal disclosures</h1>
            </div>
          </div>

          <p className="mb-6 text-muted-foreground">Last updated: April 8, 2026</p>

          <aside className="mb-10 rounded-lg border border-amber-900/40 bg-amber-950/20 p-4 text-sm text-amber-100/95">
            <strong className="text-amber-200">Important:</strong> This page provides general information about how {SITE_NAME}{' '}
            approaches compliance themes for listings, menus, and delivery or pickup experiences. It is{' '}
            <strong>not legal advice</strong>. Laws and regulations change and vary by state, county, and city. Licensed
            retailers remain responsible for their own compliance. You should consult qualified counsel and regulators for
            requirements that apply to your business or location.
          </aside>

          <div className="prose prose-invert prose-lg max-w-none space-y-10 prose-headings:text-white prose-a:text-green-400 prose-li:text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold">1. Scope and platform role</h2>
              <p>
                {SITE_NAME} operates a technology and discovery layer that helps consumers find licensed cannabis retailers,
                browse menus, and in many cases initiate orders through flows presented on the Platform. Unless expressly
                stated otherwise in a specific transaction flow, <strong>the licensed retailer or delivery operator</strong>{' '}
                is the party responsible for sale, fulfillment, regulatory compliance, and customer support for that
                order—not {SITE_NAME} as the seller of record.
              </p>
              <p>
                Our current marketplace operations emphasize <strong>California</strong> and <strong>New York</strong>{' '}
                where we onboard and surface storefronts and delivery services in line with those states&apos; authorized
                programs. The same disclosure framework applies in <strong>any U.S. jurisdiction</strong> where state law
                authorizes cannabis retail or delivery and we choose to operate; specific requirements still depend on
                applicable law and the retailer&apos;s obligations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">2. State and local coverage</h2>
              <p>
                Cannabis remains illegal under federal law; state programs exist only where state law permits. Local
                governments may impose additional limits (for example on delivery hours, zones, or store counts). Listings,
                menus, and service areas must reflect what is <strong>lawfully permitted</strong> where the consumer and the
                retailer interact. {SITE_NAME} may restrict or remove content that appears inconsistent with applicable law or
                with our policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">3. Retailer eligibility and listings</h2>
              <p>Retailers and delivery brands that appear on the Platform are expected to:</p>
              <ul>
                <li>
                  Hold and maintain <strong>all licenses, permits, and authorizations</strong> required to offer the
                  services they advertise (retail, delivery, distribution, or other roles as applicable in that state).
                </li>
                <li>
                  Provide accurate business identity, contact information, and license identifiers where we collect them in
                  onboarding or profile tools, and <strong>update</strong> that information when it changes.
                </li>
                <li>
                  Offer only product types, potencies, and transaction types that their licenses and local rules allow (for
                  example adult-use versus medical-only channels where a state maintains separate tracks).
                </li>
                <li>
                  Keep menu availability, pricing, taxes, fees, and service modes (pickup, delivery, on-site) consistent
                  with what they can lawfully fulfill.
                </li>
              </ul>
              <p>
                We may suspend, hide, or remove listings or accounts where we reasonably believe there is a compliance,
                fraud, or consumer-safety risk, subject to our{' '}
                <Link href="/terms">Terms of Service</Link>, <Link href="/vendor-agreement">Vendor Agreement</Link>, and
                related policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">4. Age, identity verification, and purchase limits</h2>
              <p>
                Minimum age, acceptable forms of identification, and purchase or possession limits are set by{' '}
                <strong>applicable state and local law</strong> and by the retailer&apos;s policies. In many adult-use markets
                the minimum age is <strong>21</strong>, but medical programs may use different thresholds or credentialing.
                Retailers are responsible for age-gating their sales and for verifying identity at pickup or delivery as the
                law requires.
              </p>
              <p>
                Where the Platform collects or transmits ID or age-related data for checkout or verification, processing is
                described at a high level in our <Link href="/privacy">Privacy Policy</Link> and handled in line with that
                policy and applicable privacy law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">5. Delivery and pickup (operating principles)</h2>
              <p>
                Where delivery or curbside pickup is offered, the retailer and any licensed carrier or contractor they use
                must comply with rules that apply in that jurisdiction. Depending on the state and locality, such rules may
                include, <strong>where applicable</strong>:
              </p>
              <ul>
                <li>Geographic delivery boundaries, municipal bans, or caps on delivery licenses;</li>
                <li>Vehicle, driver, insurance, or background requirements for delivery personnel;</li>
                <li>
                  Order limits, manifesting, inventory reconciliation, or track-and-trace reporting obligations connected to
                  regulated goods;
                </li>
                <li>Consumer address verification, secure handoff, and hours of operation;</li>
                <li>Restrictions on delivery of certain product categories (for example high-potency products where limited).</li>
              </ul>
              <p>
                {SITE_NAME} does not replace a retailer&apos;s obligation to design compliant logistics. Displayed ETAs and
                service badges are informational and may come from the retailer or from Platform defaults; they are not
                guarantees of regulatory approval of a specific route or method.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">6. Advertising, deals, and promotions</h2>
              <p>Offers, discounts, and sponsored placements on the Platform should:</p>
              <ul>
                <li>Be truthful, not misleading, and honor the stated terms (including expiration and exclusions);</li>
                <li>
                  Comply with state and local advertising restrictions (for example prohibitions on targeting minors, limits on
                  billboards or digital geotargeting, or required disclaimers);
                </li>
                <li>Respect any {SITE_NAME} or <Link href="/advertising-policy">Advertising Policy</Link> rules that apply to vendors.</li>
              </ul>
              <p>We may remove or modify promotional content that violates law or policy.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">7. Products, health, and marketing claims</h2>
              <p>
                Product descriptions, images, potency figures, and health-related statements on menus generally originate
                from <strong>retailers, brands, or licensors</strong>. {SITE_NAME} does not verify every claim and does not
                provide medical advice. Cannabis products are not evaluated by the U.S. Food and Drug Administration like
                conventional medicines unless a narrow FDA pathway applies to a specific product—which remains uncommon for
                state-legal adult-use goods.
              </p>
              <p>
                Retailers should avoid disease-treatment claims unless lawfully permitted and substantiated. Consumers should
                read official labeling and consult licensed professionals for medical questions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">8. Packaging, labeling, testing, and recalls</h2>
              <p>
                Finished goods sold to consumers must meet <strong>applicable</strong> packaging, child-resistance, universal
                symbol, ingredient, allergen, and warning-label requirements for that state. Testing and batch-level
                documentation (for example COAs) are typically the responsibility of the manufacturer, distributor, and/or
                retailer as defined locally.
              </p>
              <p>
                If a regulator or retailer initiates a recall or a stop-sale, the retailer is responsible for executing it.
                We may assist by removing SKUs or adding notices when we receive authoritative instructions consistent with our
                role as a platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">9. Taxes, fees, and pricing display</h2>
              <p>
                Excise, sales, use, and local cannabis taxes differ widely. Cart and receipt totals depend on the retailer&apos;s
                configuration, the consumer&apos;s location, product category, and current law. {SITE_NAME} may display
                estimates or breakdowns supplied by the retailer or payment tooling; the retailer remains responsible for
                correct tax collection and remittance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">10. Prohibited and high-risk conduct</h2>
              <p>The Platform must not be used to facilitate conduct that violates law or our policies, including for example:</p>
              <ul>
                <li>Diversion to illegal markets, interstate export where unlawful, or purchases on behalf of ineligible persons;</li>
                <li>Straw purchases, resale schemes, or bulk aggregation intended to circumvent purchase limits;</li>
                <li>False licensing, fake storefronts, or impersonation of another licensed business;</li>
                <li>Payment fraud, chargeback abuse, or laundering of proceeds.</li>
              </ul>
              <p>
                We cooperate with lawful requests from government and law enforcement when required, in line with our Terms
                and Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">11. Privacy and sensitive information</h2>
              <p>
                Operating a cannabis marketplace can involve sensitive data (including government ID, purchase history, and
                precise location when you choose to share it). Our collection, use, retention, and sharing practices are
                described in the <Link href="/privacy">Privacy Policy</Link>. Retailers that access consumer data through
                {SITE_NAME} tools must use it only for permitted purposes and in accordance with law and contract.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">12. Changes to this page</h2>
              <p>
                We may update this disclosure as our product, markets, or regulations evolve. The &quot;Last updated&quot; date at the
                top reflects the most recent substantive revision. Continued use of the Platform after updates may be subject
                to our Terms; material changes to personal data practices will be addressed as described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">13. Contact</h2>
              <p>
                For general questions:{' '}
                <a href="mailto:support@datreehouse.com" className="text-green-400 hover:underline">
                  support@datreehouse.com
                </a>
                . For legal or regulatory notices directed at {SITE_NAME}, use the contact information posted in our{' '}
                <Link href="/contact">Contact</Link> page or footer as updated from time to time.
              </p>
              <p className="text-base text-gray-400">
                Related documents: <Link href="/terms">Terms of Service</Link> · <Link href="/privacy">Privacy Policy</Link>{' '}
                · <Link href="/vendor-agreement">Vendor Agreement</Link> · <Link href="/order-refund-policy">Order &amp; Refund Policy</Link> ·{' '}
                <Link href="/how-it-works">How it works</Link>
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

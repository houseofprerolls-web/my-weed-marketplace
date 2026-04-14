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
  title: `Privacy Policy | ${SITE_NAME}`,
  description: `How ${SITE_NAME} collects, uses, discloses, and protects personal information when you use our marketplace and related services.`,
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
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
              <h1 className="text-3xl font-bold text-white md:text-4xl">Privacy Policy</h1>
            </div>
          </div>

          <p className="mb-6 text-gray-400">Last updated: April 8, 2026</p>

          <aside className="mb-10 rounded-lg border border-amber-900/40 bg-amber-950/20 p-4 text-sm text-amber-100/95">
            <strong className="text-amber-200">Notice:</strong> This Privacy Policy is provided for transparency and is not
            legal advice. Privacy laws vary by state and country and change over time. For how we describe platform versus
            retailer responsibilities in regulated cannabis markets, see our{' '}
            <Link href="/compliance" className="text-green-400 underline hover:text-green-300">
              Compliance disclosures
            </Link>
            .
          </aside>

          <div className="prose prose-invert prose-lg max-w-none space-y-10 prose-headings:text-white prose-a:text-green-400 prose-li:text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold">1. Who we are</h2>
              <p>
                {SITE_NAME} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website, applications, and
                related services (collectively, the &quot;Platform&quot;) that help consumers discover licensed cannabis
                retailers, browse menus, and in many cases place or initiate orders. The entity responsible for personal
                information collected through the Platform is identified in our{' '}
                <Link href="/terms">Terms of Service</Link>. When you interact with a retailer or delivery operator through
                the Platform, that business may also collect and use your information as an independent controller—see
                Section 6.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">2. Scope</h2>
              <p>
                This policy describes our practices when you visit the Platform, create or use an account, verify age or
                identity, place or attempt to place orders, subscribe to vendor or supply tools, contact support, or
                otherwise interact with us online. It does not govern third-party sites or apps that we link to; their
                policies apply there.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">3. Categories of personal information we collect</h2>
              <p>Depending on how you use the Platform, we may collect or receive the following categories of information:</p>
              <ul>
                <li>
                  <strong>Identifiers and contact data:</strong> name, email address, phone number, postal address, account
                  username or user ID, and similar identifiers you provide or that are assigned to your account.
                </li>
                <li>
                  <strong>Account and authentication data:</strong> credentials, session tokens, and security-related signals
                  associated with sign-in (for example through our authentication provider).
                </li>
                <li>
                  <strong>Commercial information:</strong> orders, carts, favorites, deal interactions, and related transaction
                  metadata needed to operate the marketplace.
                </li>
                <li>
                  <strong>Financial or payment-related data:</strong> when you pay through the Platform, payment card and
                  bank details are typically collected and processed by our payment partners. We may receive limited
                  transaction identifiers, amounts, status, and fraud-prevention signals—not full card numbers where our
                  partners tokenize or host that data.
                </li>
                <li>
                  <strong>Age and identity verification:</strong> date of birth, government ID images or numbers, selfie or
                  liveness checks, and verification outcomes, where required or offered to comply with law or retailer
                  policies.
                </li>
                <li>
                  <strong>Internet or network activity:</strong> IP address, device type, browser, approximate location
                  derived from IP, pages and features used, referring URLs, and timestamps.
                </li>
                <li>
                  <strong>First-party usage and analytics events:</strong> events such as listing views, searches, map
                  interactions, clicks (for example phone, website, directions), and similar interactions may be logged in
                  our systems to operate the product, measure performance, and support retailers.
                </li>
                <li>
                  <strong>Geolocation:</strong> precise location only where you enable it in your device or browser and we
                  request it for features such as delivery eligibility or store discovery.
                </li>
                <li>
                  <strong>Communications:</strong> messages you send to us (for example support tickets, vendor inquiries) and
                  associated metadata.
                </li>
                <li>
                  <strong>Professional or business information:</strong> for retailers, brands, or supply accounts—business
                  name, license identifiers, service areas, staff contacts, and onboarding materials you submit.
                </li>
                <li>
                  <strong>Inferences:</strong> preferences or propensities derived from your use of the Platform (for
                  example product interests), where we generate them.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">4. Sources</h2>
              <p>We collect personal information from:</p>
              <ul>
                <li>You, when you provide it directly or when your device sends it as part of using the Platform;</li>
                <li>Retailers, delivery operators, or partners involved in fulfilling a transaction you start on the Platform;</li>
                <li>Service providers that host infrastructure, process payments, verify age or identity, send communications,
                  or help detect fraud and abuse; and</li>
                <li>Automatically, through cookies, local storage, SDKs, and similar technologies necessary for sign-in and
                  core functionality.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">5. How we use personal information</h2>
              <p>We use the categories above for purposes such as:</p>
              <ul>
                <li>Providing, maintaining, and improving the Platform and its features;</li>
                <li>Creating and securing accounts, authenticating users, and troubleshooting;</li>
                <li>Connecting you with licensed retailers or delivery services and relaying order-related information;</li>
                <li>Verifying that you meet minimum age requirements and, where applicable, identity or eligibility rules;</li>
                <li>Processing payments and refunds in coordination with payment partners;</li>
                <li>Customer support, safety, fraud prevention, and enforcing our{' '}
                  <Link href="/terms">Terms of Service</Link> and acceptable use rules;</li>
                <li>Analytics and product measurement, including first-party event data stored in our environment;</li>
                <li>Communicating transactional messages (for example order status) and, where permitted, marketing—see
                  Section 10;</li>
                <li>Complying with law, responding to lawful requests, and defending legal claims; and</li>
                <li>Corporate transactions such as a merger or asset sale, subject to applicable law.</li>
              </ul>
              <p>
                Where the GDPR, UK GDPR, or similar frameworks apply, we rely on appropriate legal bases such as performance of a
                contract, legitimate interests (balanced against your rights), compliance with legal obligations, and consent
                where required (for example for certain cookies or marketing).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">6. Retailers and other independent businesses</h2>
              <p>
                Licensed retailers and delivery operators you order from may collect the same or additional information
                directly from you (for example at the door, through their POS, or their own apps). They use that information
                under their own privacy policies and as separate controllers. We encourage you to read their notices before
                you complete a purchase. We are not responsible for their independent practices, though we may facilitate
                data flows needed to complete an order you request.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">7. Disclosure of personal information</h2>
              <p>We may disclose personal information to:</p>
              <ul>
                <li>
                  <strong>Service providers and processors</strong> who perform functions on our behalf—for example cloud
                  hosting and databases (including authentication and storage), payment processing, email or SMS delivery,
                  verification vendors, customer support tooling, and security monitoring—subject to contractual
                  confidentiality and use restrictions where required by law;
                </li>
                <li>
                  <strong>Retailers and fulfillment partners</strong> to the extent needed to display menus, confirm
                  eligibility, complete delivery or pickup, and provide support for orders you place or initiate through the
                  Platform;
                </li>
                <li>
                  <strong>Professional advisors, insurers, and auditors</strong> where reasonably necessary;
                </li>
                <li>
                  <strong>Law enforcement, regulators, or other parties</strong> when we believe disclosure is required by law,
                  legal process, or to protect rights, safety, or security; and
                </li>
                <li>
                  <strong>Successors</strong> in a merger, acquisition, financing, reorganization, or sale of assets, in line
                  with applicable law.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">8. Sale, sharing, and targeted advertising</h2>
              <p>
                We do not sell your personal information for money in the traditional sense. Some U.S. state laws define
                &quot;sale&quot; or &quot;share&quot; broadly—for example, making personal information available to
                third-party advertising partners for cross-context behavioral advertising. Our primary analytics are
                first-party and service-provider driven (for example events stored in our database to understand product
                usage). If we engage partners whose activities could be characterized as a &quot;sale&quot; or
                &quot;sharing&quot; under applicable state law, we will describe that activity here and provide any opt-out
                mechanisms required by law.
              </p>
              <p>
                You may use industry opt-out tools where available (for example browser-based Global Privacy Control signals
                where we are required to honor them) and contact us as below to exercise rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">9. Sensitive personal information</h2>
              <p>
                Certain data we process may be treated as sensitive or special under state or other privacy laws—for example
                government ID used for verification, account credentials, or precise geolocation when you enable it. We use
                sensitive personal information only for reasonably expected purposes compatible with why it was collected
                (such as compliance, security, and fulfillment) and, where required, in accordance with limitations under
                applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">10. Marketing and promotional communications</h2>
              <p>
                We may send promotional emails or messages where permitted. You can opt out of marketing by using the
                unsubscribe link in those messages or by contacting us. Transactional and account-related messages may continue
                even if you opt out of marketing.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">11. Cookies and similar technologies</h2>
              <p>
                We and our service providers use cookies, local storage, pixels, and similar technologies that are
                necessary for authentication, preferences, security, and basic analytics. You can control many cookies
                through your browser; blocking strictly necessary cookies may affect sign-in or checkout.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">12. Retention</h2>
              <p>
                We retain personal information for as long as needed to provide the Platform, meet the purposes described in
                this policy, resolve disputes, enforce agreements, and satisfy legal, accounting, and reporting requirements
                (including record-keeping tied to regulated cannabis sales where applicable). Retention periods vary by data
                category and context; verification images may be kept for shorter periods than transactional records, for
                example. When retention ends, we delete or de-identify information where feasible, subject to legal holds or
                technical limitations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">13. Security</h2>
              <p>
                We implement reasonable administrative, technical, and organizational measures designed to protect personal
                information against unauthorized access, loss, or alteration. No method of transmission or storage is
                completely secure; we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">14. Age restriction and children</h2>
              <p>
                The Platform is intended only for adults who meet the minimum legal age to purchase cannabis in their
                jurisdiction (for example 21+ where that is the rule). We do not knowingly collect personal information from
                children under 13. If you believe we have collected information from a child under 13, contact us and we will
                take appropriate steps to delete it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">15. U.S. state privacy rights</h2>
              <p>
                Depending on where you live, you may have rights to access, delete, correct, obtain a copy of, or opt out of
                certain processing of your personal information, including in some states opt-out of sale or sharing and
                limit use of sensitive personal information. We will not discriminate against you for exercising privacy
                rights afforded by law.
              </p>
              <p>
                To submit a request, email us at the addresses below. We may need to verify your identity before responding
                and may decline requests where permitted by law (for example if we cannot verify you or if an exception
                applies). California residents may designate an authorized agent under applicable rules; we may require proof
                of the agent&apos;s authority.
              </p>
              <p>
                <strong>Nevada residents:</strong> Nevada law may allow you to submit a verified request directing us not to
                sell certain personal information we might sell under that statute&apos;s definition. We do not currently
                sell covered information as defined by Nevada law; you may still contact us with questions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">16. International visitors</h2>
              <p>
                We operate primarily in the United States. If you access the Platform from outside the United States, you
                understand that your information may be processed in the U.S. and other countries that may not provide the
                same level of data protection as your home country. Where required, we use appropriate safeguards for
                cross-border transfers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">17. Automated decision-making</h2>
              <p>
                We do not use solely automated decision-making that produces legal or similarly significant effects on you
                without human review, except where permitted by law and disclosed at the point of collection.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">18. Changes to this Privacy Policy</h2>
              <p>
                We may update this policy from time to time. We will post the revised version on this page and update the
                &quot;Last updated&quot; date. Where required, we will provide additional notice (for example by email or a
                prominent banner on the Platform).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">19. How to contact us</h2>
              <p>
                For privacy questions or to exercise your rights, contact us at{' '}
                <a href="mailto:privacy@datreehouse.com">privacy@datreehouse.com</a>. For general support, you may also use{' '}
                <a href="mailto:support@datreehouse.com">support@datreehouse.com</a>. For postal correspondence, email us
                first so we can provide the correct address and any reference identifiers.
              </p>
              <p className="text-gray-400">
                Related documents: <Link href="/terms">Terms of Service</Link>,{' '}
                <Link href="/compliance">Compliance disclosures</Link>,{' '}
                <Link href="/help">Help</Link>, <Link href="/contact">Contact</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

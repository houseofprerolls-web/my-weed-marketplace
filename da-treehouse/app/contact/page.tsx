import type { Metadata } from "next";
import Link from "next/link";
import { TreehouseChrome, TreehouseDivider } from "@/components/brand/TreehouseChrome";
import { ContactBusinessForm } from "@/components/contact/ContactBusinessForm";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Contact & support — list your treehouse — ${SITE_NAME}`,
  description:
    "Submit your licensed dispensary (license, phone, email) for review or reach DaTreehouse support.",
};

export default function ContactPage() {
  return (
    <TreehouseChrome variant="page" className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-green)]">
          Support & partnerships
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Contact &amp; support
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600 sm:text-base">
          Want your licensed treehouse on {SITE_NAME}? Send license details,
          dispensary name, phone, and email—we review every submission. Live shops
          stay tied to an owner account unless we add you as an admin-only
          directory listing.
        </p>

        <TreehouseDivider className="my-8" />

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-xl font-semibold text-neutral-900">
            List your business
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Tell us who you are. An admin will follow up; live shops on the
            marketplace must be tied to an owner account unless we add you as a{" "}
            <strong>directory-only</strong> listing (admin only).
          </p>
          <div className="mt-6">
            <ContactBusinessForm />
          </div>
        </section>

        <p className="mt-8 text-center text-sm text-neutral-500">
          <Link
            href="/"
            className="font-medium text-[var(--brand-red)] hover:underline"
          >
            ← Back home
          </Link>
        </p>
      </div>
    </TreehouseChrome>
  );
}

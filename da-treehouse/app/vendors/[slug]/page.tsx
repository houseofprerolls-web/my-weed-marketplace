import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VendorStoreMenu } from "@/components/vendors/VendorStoreMenu";
import { createServerSupabase } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("vendors")
    .select("name, tagline")
    .eq("slug", slug)
    .eq("is_live", true)
    .eq("license_status", "approved")
    .maybeSingle();
  if (!data) return { title: `Dispensary — ${SITE_NAME}` };
  return {
    title: `${data.name} — ${SITE_NAME}`,
    description: data.tagline ?? `${data.name} on ${SITE_NAME}`,
  };
}

export default async function VendorPublicPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerSupabase();

  const { data: vendor, error } = await supabase
    .from("vendors")
    .select(
      "id, name, slug, tagline, description, logo_url, banner_url, phone, website, address, city, state, zip"
    )
    .eq("slug", slug)
    .eq("is_live", true)
    .eq("license_status", "approved")
    .maybeSingle();

  if (error || !vendor) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <p className="mb-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:underline">
          {SITE_NAME}
        </Link>
        {" · Licensed dispensary"}
      </p>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">{vendor.name}</h1>
        <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Approved · Live menu
        </p>
        {vendor.tagline ? (
          <p className="mt-1 text-muted-foreground">{vendor.tagline}</p>
        ) : null}
        {vendor.description ? (
          <p className="mt-4 text-sm leading-relaxed">{vendor.description}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
          {vendor.city || vendor.state ? (
            <span>
              {[vendor.address, vendor.city, vendor.state, vendor.zip]
                .filter(Boolean)
                .join(", ")}
            </span>
          ) : null}
          {vendor.phone ? <span>{vendor.phone}</span> : null}
          {vendor.website ? (
            <a
              href={vendor.website}
              className="text-primary underline"
              target="_blank"
              rel="noreferrer"
            >
              Website
            </a>
          ) : null}
        </div>
      </div>

      <VendorStoreMenu
        vendorId={vendor.id}
        vendorName={vendor.name}
        vendorSlug={vendor.slug}
      />
    </div>
  );
}

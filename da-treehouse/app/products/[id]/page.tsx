import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductAddToCartClient } from "@/components/products/ProductAddToCartClient";
import { createServerSupabase } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/site";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("products")
    .select("name, vendors!inner(is_live, license_status)")
    .eq("id", id)
    .maybeSingle();

  const vRaw = data?.vendors as
    | { is_live: boolean; license_status: string }
    | { is_live: boolean; license_status: string }[]
    | null
    | undefined;
  const v = Array.isArray(vRaw) ? vRaw[0] : vRaw;
  const visible =
    v && v.is_live === true && v.license_status === "approved" && data?.name;

  if (!visible) return { title: `Product — ${SITE_NAME}` };
  return { title: `${data.name} — ${SITE_NAME}` };
}

export default async function ProductPublicPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data: row, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      category,
      price_cents,
      inventory_count,
      potency_thc,
      potency_cbd,
      description,
      in_stock,
      lab_results_url,
      strains ( id, name, slug, type ),
      vendors!inner (
        id,
        name,
        slug,
        is_live,
        license_status
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row) notFound();

  const vendorRaw = row.vendors as
    | {
        id: string;
        name: string;
        slug: string;
        is_live: boolean;
        license_status: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
        is_live: boolean;
        license_status: string;
      }[]
    | null;
  const vendor = Array.isArray(vendorRaw) ? vendorRaw[0] : vendorRaw;
  if (
    !vendor ||
    !vendor.is_live ||
    vendor.license_status !== "approved"
  ) {
    notFound();
  }

  const strainRaw = row.strains as
    | {
        id: string;
        name: string;
        slug: string;
        type: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
        type: string;
      }[]
    | null;
  const strain = Array.isArray(strainRaw) ? strainRaw[0] ?? null : strainRaw;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <p className="mb-2 text-sm text-muted-foreground">
        <Link href={`/vendors/${vendor.slug}`} className="hover:underline">
          {vendor.name}
        </Link>
      </p>
      <h1 className="text-3xl font-semibold">{row.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {row.category}
        {strain ? (
          <>
            {" · "}
            <Link
              href={`/strains/${strain.slug}`}
              className="text-primary hover:underline"
            >
              {strain.name}
            </Link>{" "}
            ({strain.type})
          </>
        ) : null}
      </p>

      <div className="mt-6 flex flex-wrap items-baseline gap-4">
        <span className="text-2xl font-semibold">
          ${(row.price_cents / 100).toFixed(2)}
        </span>
        <span
          className={
            row.in_stock
              ? "text-sm font-medium text-emerald-600"
              : "text-sm font-medium text-rose-600"
          }
        >
          {row.in_stock ? "In stock" : "Out of stock"}
        </span>
        {typeof row.inventory_count === "number" ? (
          <span className="text-sm text-muted-foreground">
            Qty: {row.inventory_count}
          </span>
        ) : null}
      </div>

      {(row.potency_thc != null || row.potency_cbd != null) && (
        <p className="mt-4 text-sm">
          {row.potency_thc != null ? <>THC: {row.potency_thc}% </> : null}
          {row.potency_cbd != null ? <>· CBD: {row.potency_cbd}%</> : null}
        </p>
      )}

      {row.description ? (
        <p className="mt-4 text-sm leading-relaxed">{row.description}</p>
      ) : null}

      {row.lab_results_url ? (
        <p className="mt-4 text-sm">
          <a
            href={row.lab_results_url}
            className="text-primary underline"
            target="_blank"
            rel="noreferrer"
          >
            Lab results
          </a>
        </p>
      ) : null}

      <ProductAddToCartClient
        productId={row.id}
        name={row.name}
        priceCents={Number(row.price_cents)}
        inStock={row.in_stock}
        vendorId={vendor.id}
        vendorName={vendor.name}
        vendorSlug={vendor.slug}
      />

      <p className="mt-10 text-center text-sm">
        <Link href="/" className="text-primary underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}

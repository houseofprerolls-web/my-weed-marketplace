import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("strains")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return { title: `Strain — ${SITE_NAME}` };
  return {
    title: `${data.name} — ${SITE_NAME}`,
    description: `Strain profile: ${data.name}`,
  };
}

export default async function StrainDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerSupabase();

  const { data: strain, error } = await supabase
    .from("strains")
    .select(
      "id, name, slug, type, thc_min, thc_max, cbd_min, cbd_max, genetics, description, effects, flavors, terpenes"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !strain) notFound();

  const { data: products } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      price_cents,
      in_stock,
      vendors ( name, slug )
    `
    )
    .eq("strain_id", strain.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <p className="mb-2 text-sm">
        <Link href="/strains" className="text-primary hover:underline">
          ← All strains
        </Link>
      </p>
      <h1 className="text-3xl font-semibold">{strain.name}</h1>
      <p className="mt-1 capitalize text-muted-foreground">{strain.type}</p>

      <div className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
        {(strain.thc_min != null || strain.thc_max != null) && (
          <div>
            <span className="font-medium">THC</span>:{" "}
            {strain.thc_min ?? "—"}–{strain.thc_max ?? "—"}%
          </div>
        )}
        {(strain.cbd_min != null || strain.cbd_max != null) && (
          <div>
            <span className="font-medium">CBD</span>:{" "}
            {strain.cbd_min ?? "—"}–{strain.cbd_max ?? "—"}%
          </div>
        )}
      </div>

      {strain.genetics ? (
        <p className="mt-4 text-sm">
          <span className="font-medium">Genetics</span>: {strain.genetics}
        </p>
      ) : null}

      {strain.description ? (
        <p className="mt-4 text-sm leading-relaxed">{strain.description}</p>
      ) : null}

      {strain.effects?.length ? (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Reported effects</h2>
          <ul className="flex flex-wrap gap-2">
            {(strain.effects as string[]).map((e) => (
              <li
                key={e}
                className="rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                {e}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {strain.flavors?.length ? (
        <div className="mt-4">
          <h2 className="mb-2 text-sm font-semibold">Flavors</h2>
          <ul className="flex flex-wrap gap-2">
            {(strain.flavors as string[]).map((f) => (
              <li
                key={f}
                className="rounded-full border px-2 py-0.5 text-xs"
              >
                {f}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {products && products.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Available from shops</h2>
          <ul className="divide-y rounded-xl border">
            {products.map((p) => {
              const vRaw = p.vendors as
                | { name: string; slug: string }
                | { name: string; slug: string }[]
                | null;
              const v = Array.isArray(vRaw) ? vRaw[0] : vRaw;
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between px-3 py-3"
                >
                  <div>
                    <Link
                      href={`/products/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                    {v ? (
                      <p className="text-xs text-muted-foreground">
                        <Link
                          href={`/vendors/${v.slug}`}
                          className="hover:underline"
                        >
                          {v.name}
                        </Link>
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm">
                    ${(p.price_cents / 100).toFixed(2)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Educational content only. Compliance with local law is your
        responsibility.
      </p>
    </div>
  );
}

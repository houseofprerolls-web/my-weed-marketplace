import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Strain encyclopedia — ${SITE_NAME}`,
  description: `Browse cannabis strains on ${SITE_NAME}.`,
};

export default async function StrainsListPage() {
  const supabase = await createServerSupabase();
  const { data: strains, error } = await supabase
    .from("strains")
    .select("id, name, slug, type, thc_min, thc_max")
    .order("name");

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-destructive">
        Could not load strains.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold">Strain encyclopedia</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Reference profiles for popular cultivars. Not medical advice.
      </p>
      {!strains?.length ? (
        <p className="text-sm text-muted-foreground">No strains yet.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {strains.map((s) => (
            <li key={s.id}>
              <Link
                href={`/strains/${s.slug}`}
                className="flex items-center justify-between px-3 py-3 hover:bg-muted/40"
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-xs capitalize text-muted-foreground">
                  {s.type}
                  {s.thc_min != null || s.thc_max != null
                    ? ` · THC ${s.thc_min ?? "—"}–${s.thc_max ?? "—"}%`
                    : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

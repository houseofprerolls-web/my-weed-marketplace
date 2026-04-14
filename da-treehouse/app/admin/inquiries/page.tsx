import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isMasterAccountEmail } from "@/lib/auth/master";
import { AdminInquiriesClient } from "@/components/admin/AdminInquiriesClient";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Business leads — Admin",
};

export default async function AdminInquiriesPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/inquiries");

  try {
    await supabase.rpc("sync_master_profile_role");
  } catch {
    /* optional */
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && !isMasterAccountEmail(user.email)) {
    redirect("/");
  }

  const { data: rows, error } = await supabase
    .from("business_inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="text-sm text-red-300">
        <p>Could not load inquiries. Apply migrations 0020 and 0021.</p>
        <p className="mt-2 text-neutral-400">{error.message}</p>
        <Link href="/admin" className="mt-4 inline-block text-[var(--brand-green-soft)]">
          ← Admin
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">
        Business leads
      </h1>
      <p className="mt-2 text-sm text-neutral-400">
        Submissions from the contact / list-your-business form.
      </p>
      <div className="mt-6">
        <AdminInquiriesClient initialRows={rows ?? []} />
      </div>
    </div>
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMasterAccountEmail } from "@/lib/auth/master";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/inquiries");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && !isMasterAccountEmail(user.email)) {
    redirect("/");
  }
  return supabase;
}

export async function updateInquiryStatusAction(
  id: string,
  status: "new" | "reviewed" | "contacted" | "archived"
) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("business_inquiries")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/inquiries");
}

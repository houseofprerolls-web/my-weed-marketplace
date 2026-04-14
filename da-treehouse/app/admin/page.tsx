import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isMasterAccountEmail } from "@/lib/auth/master";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Admin — ${SITE_NAME}`,
};

export default async function AdminHomePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  try {
    await supabase.rpc("sync_master_profile_role");
  } catch {
    /* optional until migration 0017 */
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && !isMasterAccountEmail(user.email)) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold">Admin</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Master controls for{" "}
        <span className="font-medium text-foreground">{user.email}</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/features">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="text-base">Feature flags</CardTitle>
              <CardDescription>
                Turn catalog sections, nav links, and sign-up on or off.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-primary">Open →</CardContent>
          </Card>
        </Link>
        <Link href="/admin/vendors">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="text-base">Vendor applications</CardTitle>
              <CardDescription>
                Approve, reject, or request more info for vendor accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-primary">Open →</CardContent>
          </Card>
        </Link>
        <Link href="/admin/placements">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="text-base">Regional premium slots</CardTitle>
              <CardDescription>
                Sponsored ordering per ZIP on the shopper homepage.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-primary">Open →</CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

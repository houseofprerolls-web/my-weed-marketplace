import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { SignupForm } from "@/components/auth/SignupForm";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Sign up — ${SITE_NAME}`,
  description: "Create a consumer account (21+).",
};

export default async function SignupPage() {
  const supabase = await createServerSupabase();
  const { data: flag, error: flagErr } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", "auth_signup")
    .maybeSingle();

  if (!flagErr && flag && flag.enabled === false) {
    redirect("/login?notice=signup_disabled");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold">Create your account</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        All new accounts are consumers. Vendor access is added later through
        Vendor Hub and admin approval.
      </p>
      <SignupForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}

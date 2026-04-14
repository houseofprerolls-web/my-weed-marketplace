import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/LoginForm";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Log in — ${SITE_NAME}`,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServerSupabase();
  const { data: flag, error: flagErr } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", "auth_signup")
    .maybeSingle();

  const showSignup = flagErr || flag?.enabled !== false;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold">Log in</h1>
      {params.notice === "signup_disabled" ? (
        <p className="mb-4 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          New sign-ups are temporarily closed. Use log in if you already have
          an account.
        </p>
      ) : null}
      <LoginForm />
      {showSignup ? (
        <p className="mt-6 text-sm text-muted-foreground">
          New here?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      ) : null}
    </div>
  );
}

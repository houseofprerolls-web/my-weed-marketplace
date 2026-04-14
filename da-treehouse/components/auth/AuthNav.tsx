"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { isMasterAccountEmail } from "@/lib/auth/master";
import { Button } from "@/components/ui/button";
import { useFeatureFlags } from "@/lib/feature-flags/context";

function displayName(user: User, fullName: string | null) {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    typeof meta?.full_name === "string" ? meta.full_name.trim() : "";
  if (fromMeta) return fromMeta;
  if (fullName?.trim()) return fullName.trim();
  return user.email ?? "Account";
}

const linkNeutral =
  "text-muted-foreground hover:text-foreground transition-colors";
const linkDark =
  "text-neutral-300 hover:text-white transition-colors";

export function AuthNav({ variant = "default" }: { variant?: "default" | "dark" }) {
  const link = variant === "dark" ? linkDark : linkNeutral;
  const router = useRouter();
  const { flags } = useFeatureFlags();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    const applyUser = async (next: User | null) => {
      setUser(next);
      if (!next) {
        setRole(null);
        setFullName(null);
        return;
      }
      try {
        await supabase.rpc("sync_master_profile_role");
      } catch {
        /* migration 0017 not applied yet */
      }
      const { data } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", next.id)
        .single();
      setRole(data?.role ?? null);
      setFullName(data?.full_name ?? null);
    };

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await applyUser(session?.user ?? null);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      await applyUser(session?.user ?? null);
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED"
      ) {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const isMaster = isMasterAccountEmail(user?.email);
  const isAdmin = role === "admin" || isMaster;
  const showVendorHub = isAdmin || flags.nav_vendor_hub !== false;
  const showSignup = isAdmin || flags.auth_signup !== false;

  return (
    <nav className="flex flex-wrap items-center justify-end gap-2 text-sm sm:gap-3">
      <Link href="/contact" className={link}>
        Contact
      </Link>
      <Link href="/" className={link}>
        Shops
      </Link>
      <Link href="/catalog" className={link}>
        Map
      </Link>
      <Link href="/strains" className={link}>
        Strains
      </Link>
      {user ? (
        <>
          {showVendorHub ? (
            <Link href="/vendor/hub" className={link}>
              Vendor hub
            </Link>
          ) : null}
          {role === "vendor" ? (
            <Link
              href="/vendor/dashboard"
              className={
                variant === "dark"
                  ? "font-medium text-[var(--brand-green-soft)] hover:underline"
                  : "font-medium text-primary hover:underline"
              }
            >
              Dashboard
            </Link>
          ) : null}
          {isAdmin ? (
            <Link
              href="/admin"
              className={
                variant === "dark"
                  ? "font-medium text-[var(--brand-red)] hover:underline"
                  : "font-medium text-primary hover:underline"
              }
            >
              Admin
            </Link>
          ) : null}
          <span
            className={
              variant === "dark"
                ? "max-w-[120px] truncate text-xs text-neutral-400 sm:max-w-[200px] sm:text-sm"
                : "max-w-[200px] truncate text-xs text-muted-foreground sm:text-sm"
            }
            title={user.email ?? undefined}
          >
            {displayName(user, fullName)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={
              variant === "dark"
                ? "border-white/25 bg-transparent text-white hover:bg-white/10"
                : undefined
            }
            onClick={async () => {
              const supabase = createBrowserSupabase();
              await supabase.auth.signOut();
              router.refresh();
              router.push("/");
            }}
          >
            Sign out
          </Button>
        </>
      ) : (
        <>
          <Link href="/login" className={link}>
            Log in
          </Link>
          {showSignup ? (
            <Link
              href="/signup"
              className="rounded-lg bg-[var(--brand-red)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-red-hover)]"
            >
              Sign up
            </Link>
          ) : null}
        </>
      )}
    </nav>
  );
}

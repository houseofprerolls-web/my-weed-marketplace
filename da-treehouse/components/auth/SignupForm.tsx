"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { isAtLeast21Birthdate } from "@/lib/auth/age";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [ageAck, setAgeAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!ageAck) {
      setError("Please confirm you are 21 or older.");
      return;
    }
    if (!isAtLeast21Birthdate(birthdate)) {
      setError("You must be at least 21 years old to register.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const origin = window.location.origin;

      const { data, error: signErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/`,
          data: {
            full_name: fullName.trim() || null,
            birthdate,
            age_verified_ack: true,
          },
        },
      });

      if (signErr) {
        setError(signErr.message);
        return;
      }

      if (data.session) {
        setMessage("Account created. Redirecting…");
        try {
          await supabase.rpc("sync_master_profile_role");
        } catch {
          /* optional until DB migration */
        }
        window.location.assign("/");
        return;
      }

      setMessage(
        "Check your email to confirm your account. After confirming, you can log in."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-foreground">
          {message}
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="fullName">Full name (optional)</Label>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="birthdate">Date of birth</Label>
        <Input
          id="birthdate"
          name="birthdate"
          type="date"
          required
          value={birthdate}
          onChange={(e) => setBirthdate(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Used once at signup to confirm you are 21+.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={ageAck}
          onChange={(e) => setAgeAck(e.target.checked)}
          className="mt-1"
        />
        <span>I am 21 years of age or older.</span>
      </label>

      <Button type="submit" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

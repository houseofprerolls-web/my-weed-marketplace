'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { SITE_NAME } from '@/lib/brand';
import { BrandLogo } from '@/components/brand/BrandLogo';
import {
  treehouseAuthInputClass,
  treehouseAuthLogoFrameClass,
  treehouseAuthPanelClass,
  treehouseAuthPrimaryButtonClass,
} from '@/lib/treehouseAuthPortal';
import { cn } from '@/lib/utils';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [canSetPassword, setCanSetPassword] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setChecking(false);
      setError('Sign-in is not configured.');
      return;
    }

    const hashLooksLikeRecovery =
      typeof window !== 'undefined' &&
      (/type=recovery/.test(window.location.hash) ||
        /type%3Drecovery/.test(window.location.hash) ||
        /type=recovery/.test(window.location.search));

    let cancelled = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY') {
        setCanSetPassword(true);
        setChecking(false);
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user && hashLooksLikeRecovery) {
        setCanSetPassword(true);
      }
      setChecking(false);
    });

    const t = window.setTimeout(() => {
      if (!cancelled) setChecking(false);
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      await supabase.auth.signOut();
      window.setTimeout(() => router.push('/'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-white">
        <div className={cn('flex flex-col items-center rounded-xl p-10', treehouseAuthPanelClass)}>
          <div className={treehouseAuthLogoFrameClass}>
            <BrandLogo className="justify-center" priority />
          </div>
          <Loader2 className="mt-6 h-8 w-8 animate-spin text-brand-lime" aria-hidden />
          <p className="mt-4 text-sm text-zinc-400">Checking your reset link…</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-white">
        <Card className={cn('w-full max-w-md rounded-xl p-8 text-center', treehouseAuthPanelClass)}>
          <div className="mx-auto mb-4 w-fit">
            <div className={treehouseAuthLogoFrameClass}>
              <BrandLogo className="justify-center" priority />
            </div>
          </div>
          <p className="text-lg font-semibold text-white">Password updated</p>
          <p className="mt-2 text-sm text-zinc-400">You can sign in with your new password. Redirecting…</p>
          <Button asChild className={cn('mt-6', treehouseAuthPrimaryButtonClass)}>
            <Link href="/">Continue to {SITE_NAME}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (!canSetPassword) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-white">
        <Card
          className={cn(
            'w-full max-w-md rounded-xl p-8',
            treehouseAuthPanelClass,
            'border-amber-700/55 ring-amber-400/30'
          )}
        >
          <div className="mx-auto mb-4 w-fit">
            <div className={treehouseAuthLogoFrameClass}>
              <BrandLogo className="justify-center" priority />
            </div>
          </div>
          <p className="text-lg font-semibold text-white">Link invalid or expired</p>
          <p className="mt-2 text-sm text-zinc-400">
            Request a new reset email from the sign-in screen (Forgot your password).
          </p>
          <Button
            asChild
            variant="outline"
            className="mt-6 w-full border-brand-lime/35 text-brand-lime hover:bg-black/40 hover:text-brand-lime"
          >
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-white">
      <Card className={cn('w-full max-w-md rounded-xl p-8', treehouseAuthPanelClass)}>
        <div className="mx-auto mb-6 w-fit">
          <div className={treehouseAuthLogoFrameClass}>
            <BrandLogo className="justify-center" priority />
          </div>
        </div>
        <h1 className="text-xl font-bold text-white">Choose a new password</h1>
        <p className="mt-1 text-sm text-zinc-400">Use this only from the link in your email.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="new-password" className="text-zinc-300">
              New password
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={cn(treehouseAuthInputClass, 'mt-1')}
            />
          </div>
          <div>
            <Label htmlFor="confirm-password" className="text-zinc-300">
              Confirm password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className={cn(treehouseAuthInputClass, 'mt-1')}
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" disabled={submitting} className={treehouseAuthPrimaryButtonClass}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

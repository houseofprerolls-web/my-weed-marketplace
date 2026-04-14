"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { authErrorToastContent } from '@/lib/authUserFacingError';
import {
  treehouseAuthGhostLinkClass,
  treehouseAuthInputClass,
  treehouseAuthPrimaryButtonClass,
} from '@/lib/treehouseAuthPortal';
import { authErrorLooksEmailNotConfirmed } from '@/components/auth/authUnconfirmed';
import { cn } from '@/lib/utils';

type SignInCredentialsFormProps = {
  /** Called after a successful sign-in (e.g. close modal or redirect). */
  onSuccess?: () => void;
  className?: string;
  /** Prefill sign-in email (e.g. after sign-up confirmation message). */
  initialEmail?: string;
};

export function SignInCredentialsForm({ onSuccess, className, initialEmail }: SignInCredentialsFormProps) {
  const { signIn, requestPasswordReset, resendSignupConfirmation } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [showResendHint, setShowResendHint] = useState(false);
  const [signInData, setSignInData] = useState({ email: initialEmail?.trim() ?? '', password: '' });

  useEffect(() => {
    if (initialEmail?.trim()) {
      setSignInData((s) => ({ ...s, email: initialEmail.trim() }));
    }
  }, [initialEmail]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowResendHint(false);
    if (!isSupabaseConfigured) {
      toast({
        title: 'Sign-in unavailable',
        description:
          'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      await signIn(signInData.email, signInData.password);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
      onSuccess?.();
    } catch (error: unknown) {
      if (authErrorLooksEmailNotConfirmed(error)) {
        setShowResendHint(true);
      }
      const { title, description } = authErrorToastContent(error);
      toast({ title, description, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: 'Unavailable',
        description: 'Supabase is not configured.',
        variant: 'destructive',
      });
      return;
    }
    const id = signInData.email.trim();
    if (!id) {
      toast({
        title: 'Email or username required',
        description: 'Enter the email or username you signed up with, then try again.',
        variant: 'destructive',
      });
      return;
    }
    setResendBusy(true);
    try {
      await resendSignupConfirmation(id);
      toast({
        title: 'Confirmation sent',
        description: 'Check your inbox and spam for the new link. It can take a minute.',
      });
    } catch (error: unknown) {
      const { title, description } = authErrorToastContent(error);
      toast({ title, description, variant: 'destructive' });
    } finally {
      setResendBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: 'Unavailable',
        description: 'Supabase is not configured.',
        variant: 'destructive',
      });
      return;
    }
    let email = signInData.email.trim();
    if (!email) {
      toast({
        title: 'Email or username required',
        description: 'Enter the email (or username) for your account, then tap Forgot your password again.',
        variant: 'destructive',
      });
      return;
    }
    if (!email.includes('@')) {
      const { data, error } = await supabase.rpc('lookup_email_for_login', { p_identifier: email });
      if (error || typeof data !== 'string' || !data.trim()) {
        toast({
          title: 'Could not find account',
          description: 'Use the email on your account for password reset, or sign in with your username first.',
          variant: 'destructive',
        });
        return;
      }
      email = data.trim();
    }
    setResetSending(true);
    try {
      await requestPasswordReset(email);
      toast({
        title: 'Check your email',
        description: 'We sent a link to reset your password. It may take a minute to arrive.',
      });
    } catch (error: unknown) {
      toast({
        title: 'Could not send reset email',
        description: error instanceof Error ? error.message : 'Try again later.',
        variant: 'destructive',
      });
    } finally {
      setResetSending(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className={className ?? 'space-y-4'}>
      <div>
        <Label htmlFor="signin-email" className="text-zinc-300">
          Email or username
        </Label>
        <Input
          id="signin-email"
          type="text"
          autoComplete="username"
          placeholder="you@email.com or your_username"
          value={signInData.email}
          onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
          required
          className={cn(treehouseAuthInputClass, 'mt-1')}
        />
      </div>
      <div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="signin-password" className="text-zinc-300">
            Password
          </Label>
          <button
            type="button"
            onClick={() => void handleForgotPassword()}
            disabled={loading || resetSending || resendBusy}
            className={cn(treehouseAuthGhostLinkClass, 'text-xs')}
          >
            {resetSending ? 'Sending…' : 'Forgot your password?'}
          </button>
        </div>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          value={signInData.password}
          onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
          required
          className={cn(treehouseAuthInputClass, 'mt-1')}
        />
      </div>

      {showResendHint ? (
        <div className="rounded-lg border border-brand-lime/30 bg-black/40 px-3 py-3 text-sm text-zinc-200">
          <p className="mb-2 text-zinc-300">Your account is not verified yet. Resend the confirmation link to the same
            email you used to sign up.</p>
          <Button
            type="button"
            variant="outline"
            disabled={resendBusy || loading}
            onClick={() => void handleResendConfirmation()}
            className="w-full border-brand-lime/40 bg-brand-lime/10 text-white hover:bg-brand-lime/15 hover:text-white"
          >
            {resendBusy ? 'Sending…' : 'Resend confirmation email'}
          </Button>
        </div>
      ) : null}

      <Button type="submit" disabled={loading} className={treehouseAuthPrimaryButtonClass}>
        {loading ? 'Signing In...' : 'Sign In'}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => void handleResendConfirmation()}
          disabled={resendBusy || loading}
          className={cn(treehouseAuthGhostLinkClass, 'text-xs')}
        >
          {resendBusy ? 'Sending…' : "Didn't get the confirmation email?"}
        </button>
      </div>
    </form>
  );
}

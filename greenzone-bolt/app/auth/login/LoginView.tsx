"use client";

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { SignInCredentialsForm } from '@/components/auth/SignInCredentialsForm';
import { SITE_NAME } from '@/lib/brand';
import {
  treehouseAuthGhostLinkClass,
  treehouseAuthLogoFrameClass,
  treehouseAuthPanelClass,
} from '@/lib/treehouseAuthPortal';
import { cn } from '@/lib/utils';

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get('next')?.trim();
  const nextPath =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/account';

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Card className={cn('w-full max-w-md rounded-xl p-8', treehouseAuthPanelClass)}>
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className={treehouseAuthLogoFrameClass}>
            <BrandLogo className="justify-center" priority />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Sign in to {SITE_NAME}</h1>
          <p className="text-sm text-zinc-400">Use the email or username and password for your account.</p>
        </div>

        <SignInCredentialsForm onSuccess={() => router.push(nextPath.startsWith('/') ? nextPath : '/account')} />

        <div className="mt-6 space-y-3 text-center text-sm">
          <p className="text-zinc-500">
            New shopper?{' '}
            <Link href="/" className={treehouseAuthGhostLinkClass}>
              Go home and open Sign Up
            </Link>{' '}
            from the menu.
          </p>
          <p className="text-zinc-500">
            Licensed operator?{' '}
            <Link href="/list-your-business" className={treehouseAuthGhostLinkClass}>
              List your business
            </Link>
            .
          </p>
          <Link href="/" className="inline-block text-xs text-zinc-600 hover:text-brand-lime/80">
            ← Back to home
          </Link>
        </div>
      </Card>
    </div>
  );
}

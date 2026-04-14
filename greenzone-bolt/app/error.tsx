'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app/error]', error.message, error.digest);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
      <p className="mt-2 text-sm text-zinc-400">
        This page hit an error. You can retry or go back to browsing.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button type="button" className="bg-brand-red text-white hover:bg-brand-red-deep" onClick={() => reset()}>
          Try again
        </Button>
        <Button type="button" variant="outline" className="border-zinc-600" asChild>
          <Link href="/discover">Discover</Link>
        </Button>
      </div>
    </div>
  );
}

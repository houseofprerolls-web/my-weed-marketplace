'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Next.js `app/error.tsx` only wraps the page `children` slot — not `Header` / `Footer` in the root layout.
 * A throw there can blank every route; this boundary catches chrome and main subtree errors below it.
 */
export class AppShellErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[AppShellErrorBoundary]', error.message, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-white">
          <p className="text-lg font-semibold">This view couldn&apos;t load</p>
          <p className="mt-2 max-w-md text-sm text-zinc-400">
            A client error stopped the layout. Check the browser console for details, then try again.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              className="bg-brand-red text-white hover:bg-brand-red-deep"
              onClick={() => window.location.reload()}
            >
              Reload page
            </Button>
            <Button type="button" variant="outline" className="border-zinc-600" asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

/**
 * Admin routes use their own chrome (AdminAppShell). The marketing Header + Footer
 * steal vertical space on phones and break flex/scroll layout — omit them under /admin.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isAdmin = pathname.startsWith('/admin');
  const isEmbed = pathname.startsWith('/embed');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!isAdmin && !isEmbed ? <Header /> : null}
      <main
        className={cn(
          'relative bg-black',
          isAdmin || isEmbed ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'flex-1'
        )}
      >
        {!isAdmin && !isEmbed ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-0 h-px bg-gradient-to-r from-transparent via-brand-red/50 to-transparent"
            aria-hidden
          />
        ) : null}
        <div
          className={cn(
            'relative',
            isAdmin || isEmbed ? 'flex min-h-0 flex-1 flex-col' : 'z-[1] flex-1 flex-col'
          )}
        >
          {children}
        </div>
      </main>
      {!isAdmin && !isEmbed ? <Footer /> : null}
    </div>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SITE_NAME } from '@/lib/brand';

type BrandLogoProps = {
  className?: string;
  /** Use on first paint (e.g. header) to avoid layout shift */
  priority?: boolean;
};

export function BrandLogo({ className, priority }: BrandLogoProps) {
  return (
    <Link
      href="/"
      className={cn('flex items-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red rounded-md', className)}
      aria-label={`${SITE_NAME} home`}
    >
      <Image
        src="/brand/datreehouse-logo.png"
        alt={SITE_NAME}
        width={220}
        height={88}
        className="h-9 w-auto object-contain object-left sm:h-10"
        priority={priority}
      />
    </Link>
  );
}

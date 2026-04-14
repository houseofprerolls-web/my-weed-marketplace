import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SITE_NAME } from '@/lib/brand';
import { DATREEHOUSE_LOGO_PX_HEIGHT, DATREEHOUSE_LOGO_PX_WIDTH, TREEHOUSE_CAROUSEL_LOGO_URL } from '@/lib/treehouseCarouselAsset';

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
        src={TREEHOUSE_CAROUSEL_LOGO_URL}
        alt={SITE_NAME}
        width={DATREEHOUSE_LOGO_PX_WIDTH}
        height={DATREEHOUSE_LOGO_PX_HEIGHT}
        className="h-10 w-auto max-h-11 object-contain object-left sm:h-11"
        priority={priority}
      />
    </Link>
  );
}

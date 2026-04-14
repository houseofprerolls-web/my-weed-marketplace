import Image from "next/image";
import Link from "next/link";
import { AuthNav } from "@/components/auth/AuthNav";
import { CartHeaderLink } from "@/components/cart/CartHeaderLink";
import { SITE_NAME } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950 text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-md outline-none ring-offset-2 ring-offset-neutral-950 focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
            title={`${SITE_NAME} — Home`}
          >
            <Image
              src="/brand/datreehouse-logo.png"
              alt=""
              width={44}
              height={44}
              className="h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11"
              priority
            />
            <span className="hidden min-w-0 flex-col leading-none sm:flex">
              <span className="font-display text-lg font-semibold tracking-tight text-white">
                DaTree
                <span className="text-[var(--brand-green-soft)]">house</span>
              </span>
              <span className="font-display text-[9px] font-normal uppercase tracking-[0.25em] text-neutral-400">
                Marketplace
              </span>
            </span>
          </Link>
          <span
            className="hidden shrink-0 rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-[10px] font-bold leading-none text-neutral-300 sm:inline"
            title="This service is intended for adults 21+ only where legal."
            role="img"
            aria-label="Adults twenty-one plus only"
          >
            21+
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/contact"
            className="hidden text-xs font-medium text-neutral-400 hover:text-white sm:inline"
          >
            Contact
          </Link>
          <CartHeaderLink inverse />
          <AuthNav variant="dark" />
        </div>
      </div>
    </header>
  );
}

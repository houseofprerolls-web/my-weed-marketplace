import Image from "next/image";
import Link from "next/link";
import { TreehouseChrome } from "@/components/brand/TreehouseChrome";
import { SITE_NAME } from "@/lib/site";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/vendors", label: "Applications" },
  { href: "/admin/inquiries", label: "Business leads" },
  { href: "/admin/directory", label: "Directory (no owner)" },
  { href: "/admin/placements", label: "Regional slots" },
  { href: "/admin/features", label: "Feature flags" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TreehouseChrome variant="admin" className="min-h-full flex-1 bg-[#0a1210]">
      <div className="border-b border-white/10 bg-gradient-to-r from-neutral-950 via-[#142920] to-neutral-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-white"
            >
              <Image
                src="/brand/datreehouse-logo.png"
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
              <span>
                {SITE_NAME}{" "}
                <span className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--brand-green-soft)]">
                  admin canopy
                </span>
              </span>
            </Link>
            <Link
              href="/"
              className="text-xs font-medium text-neutral-400 hover:text-white"
            >
              ← Public site
            </Link>
          </div>
          <nav
            className="flex flex-wrap gap-x-1 gap-y-2 text-sm"
            aria-label="Admin"
          >
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-neutral-200 transition hover:border-[var(--brand-red)]/35 hover:bg-white/10 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="admin-panel mx-auto w-full max-w-6xl flex-1 px-4 py-6 text-neutral-100 sm:px-6 sm:py-8 [&_.text-muted-foreground]:text-neutral-400 [&_a.text-muted-foreground]:text-neutral-400 [&_a.text-muted-foreground:hover]:text-white [&_.border-border]:border-white/10 [&_.bg-card]:bg-neutral-900/70 [&_.bg-muted]:bg-white/5">
        {children}
      </div>
    </TreehouseChrome>
  );
}

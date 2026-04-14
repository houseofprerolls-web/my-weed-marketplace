import type { ReactNode } from "react";

/**
 * Subtle tree / treehouse frame used sitewide (and admin) for DaTreehouse identity.
 */
export function TreehouseChrome({
  children,
  className = "",
  variant = "page",
}: {
  children: ReactNode;
  className?: string;
  /** page: light mint wash; admin: darker canopy strip */
  variant?: "page" | "admin";
}) {
  const bg =
    variant === "admin"
      ? "from-[#0f1f18] via-[#152a22] to-[#0f1f18]"
      : "from-[#f3faf6] via-white to-[#f0f9f4]";

  return (
    <div className={`relative min-h-0 ${className}`}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-[0.35]"
        aria-hidden
        style={{
          background: `radial-gradient(ellipse 80% 100% at 50% -20%, rgb(27 110 63 / 0.12), transparent), radial-gradient(ellipse 40% 60% at 12% 20%, rgb(227 24 55 / 0.06), transparent), radial-gradient(ellipse 35% 50% at 88% 15%, rgb(27 110 63 / 0.08), transparent)`,
        }}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t ${bg} to-transparent opacity-50`}
        aria-hidden
      />
      {/* Corner treehouse silhouettes */}
      <svg
        className="pointer-events-none absolute left-2 top-16 h-16 w-10 text-[var(--brand-green)]/20 sm:left-4 sm:h-20 sm:w-12"
        viewBox="0 0 40 64"
        fill="currentColor"
        aria-hidden
      >
        <path d="M20 4 L36 28 H28 L32 40 H24 L28 52 H12 L16 40 H8 L12 28 H4 Z M14 52 H26 V60 H14 Z" />
      </svg>
      <svg
        className="pointer-events-none absolute right-2 top-20 h-14 w-9 text-[var(--brand-green)]/15 sm:right-6 sm:h-18 sm:w-11"
        viewBox="0 0 40 64"
        fill="currentColor"
        aria-hidden
      >
        <path d="M20 8 L34 30 H26 L30 42 H22 L26 54 H14 L18 42 H10 L14 30 H6 Z M15 54 H25 V62 H15 Z" />
      </svg>
      <svg
        className={`pointer-events-none absolute text-[var(--brand-green)]/12 ${
          variant === "admin"
            ? "bottom-20 left-8 h-9 w-5 sm:left-12"
            : "bottom-24 left-1/4 h-10 w-6 -translate-x-1/2"
        }`}
        viewBox="0 0 40 64"
        fill="currentColor"
        aria-hidden
      >
        <path d="M20 4 L36 28 H28 L32 40 H24 L28 52 H12 L16 40 H8 L12 28 H4 Z M14 52 H26 V60 H14 Z" />
      </svg>
      <svg
        className={`pointer-events-none absolute text-[var(--brand-red)]/10 ${
          variant === "admin"
            ? "bottom-28 right-8 h-10 w-6 sm:right-14"
            : "bottom-32 right-1/4 h-12 w-7 translate-x-1/2"
        }`}
        viewBox="0 0 40 64"
        fill="currentColor"
        aria-hidden
      >
        <path d="M20 6 L35 29 H27 L31 41 H23 L27 53 H13 L17 41 H9 L13 29 H5 Z M14 53 H26 V61 H14 Z" />
      </svg>
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

export function TreehouseDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 py-2 ${className}`}
      role="separator"
      aria-hidden
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--brand-green)]/30 to-transparent" />
      <span className="font-display text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--brand-green)]/70">
        treehouse
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--brand-green)]/30 to-transparent" />
    </div>
  );
}

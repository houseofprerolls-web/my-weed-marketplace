"use client";

import Image from "next/image";
import { SITE_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const LOGO = "/brand/datreehouse-logo.png";

export function TreehouseSmokingLoader({
  label = "Loading…",
  className,
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center justify-center gap-3",
        compact ? "py-10" : "min-h-[60vh]",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <Image
          src={LOGO}
          alt={SITE_NAME}
          width={1024}
          height={1024}
          priority
          className={cn(
            "h-auto w-[min(14rem,75vw)] object-contain object-top opacity-95",
            compact ? "max-h-[120px]" : "max-h-[160px]"
          )}
        />

        {/* Smoke from roof chimney (mark is square PNG; house + wordmark) */}
        <span className="th-smoke th-smoke-1" aria-hidden />
        <span className="th-smoke th-smoke-2" aria-hidden />
        <span className="th-smoke th-smoke-3" aria-hidden />
      </div>

      <div className="text-sm font-medium text-gray-300">{label}</div>

      <style jsx>{`
        .th-smoke {
          position: absolute;
          left: 64%;
          top: 9%;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.04) 65%);
          filter: blur(0.2px);
          opacity: 0;
          transform: translate3d(0, 0, 0) scale(0.9);
          animation: thSmoke 1.8s infinite ease-in-out;
        }
        .th-smoke-2 {
          left: 61%;
          top: 11%;
          width: 14px;
          height: 14px;
          animation-delay: 0.35s;
        }
        .th-smoke-3 {
          left: 67%;
          top: 12%;
          width: 10px;
          height: 10px;
          animation-delay: 0.7s;
        }
        @keyframes thSmoke {
          0% {
            opacity: 0;
            transform: translate3d(0, 6px, 0) scale(0.85);
          }
          25% {
            opacity: 0.55;
          }
          55% {
            opacity: 0.28;
          }
          100% {
            opacity: 0;
            transform: translate3d(-8px, -32px, 0) scale(1.4);
          }
        }
      `}</style>
    </div>
  );
}


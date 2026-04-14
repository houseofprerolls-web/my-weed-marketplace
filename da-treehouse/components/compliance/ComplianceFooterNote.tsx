import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function ComplianceFooterNote() {
  return (
    <footer
      className="mt-auto border-t bg-muted/30 text-muted-foreground"
      role="contentinfo"
    >
      <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs leading-relaxed sm:px-6 sm:text-left">
        <p>
          <strong className="font-medium text-foreground">Location &amp; maps.</strong>{" "}
          Features that show nearby businesses may use your browser location
          (if you allow it) or general region to improve relevance. Accuracy is
          not guaranteed—always confirm legality and licensing in your area.
        </p>
        <p className="mt-2">
          Use {SITE_NAME} only where cannabis is legal for adults 21+ and in
          compliance with local rules.{" "}
          <Link
            href="/contact"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Contact &amp; list your treehouse
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}

import type { Metadata } from "next";
import { DM_Sans, Fraunces, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/app/providers";
import { SiteHeader } from "@/components/SiteHeader";
import { AgeGateModal } from "@/components/compliance/AgeGateModal";
import { ComplianceBanner } from "@/components/compliance/ComplianceBanner";
import { ComplianceFooterNote } from "@/components/compliance/ComplianceFooterNote";
import { GeoCapture } from "@/components/geo/GeoCapture";
import { TreehouseChrome } from "@/components/brand/TreehouseChrome";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/** UI body copy — clean, marketplace-readable */
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

/** Display / headlines — pairs with logo serif accent */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${dmSans.variable} ${fraunces.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground antialiased">
        <AppProviders>
          <ComplianceBanner />
          <GeoCapture />
          <AgeGateModal />
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <ComplianceFooterNote />
        </AppProviders>
      </body>
    </html>
  );
}

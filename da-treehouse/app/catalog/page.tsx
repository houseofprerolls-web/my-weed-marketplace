import type { Metadata } from "next";
import CatalogClient from "@/components/catalog/CatalogClient";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Map view — ${SITE_NAME}`,
  description: "Browse the vendor map and product grid.",
};

export default function CatalogPage() {
  return <CatalogClient />;
}

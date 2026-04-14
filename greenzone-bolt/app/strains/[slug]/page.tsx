"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VendorCard } from "@/components/vendors/VendorCard";
import { Leaf, Clock, Sparkles, MapPin, ArrowLeft } from "lucide-react";
import { StrainHeroImage } from "@/components/strains/StrainHeroImage";
import { StrainStarAverage } from "@/components/strains/StrainStarAverage";
import { trackEvent } from "@/lib/analytics";
import { readShopperZip5 } from "@/lib/shopperLocation";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TreehouseSmokingLoader } from "@/components/TreehouseSmokingLoader";
import { formatStrainEffectForDisplay } from "@/lib/strainEffectLabels";
import {
  displayStrainReviewCountForPhotoCard,
  strainDisplayAverageRating,
  strainRowHasCatalogPhoto,
} from "@/lib/strainDirectoryDisplay";
import { useVendorsSchema } from "@/contexts/VendorsSchemaContext";
import { listingHrefForVendor } from "@/lib/listingPath";
import {
  resolveStoreListingCardTheme,
  type ResolvedSkuCardTheme,
} from "@/lib/vendorSkuCardTheme";

interface Strain {
  id: string;
  name: string;
  slug: string;
  type: "indica" | "sativa" | "hybrid";
  thc_min: number;
  thc_max: number;
  cbd_min: number;
  cbd_max: number;
  effects: string[];
  flavors: string[];
  description: string;
  best_time: string;
  is_trending: boolean;
  image_url?: string | null;
  has_hero_image?: boolean | null;
  rating?: number | null;
  review_count?: number | null;
}

interface Product {
  id: string;
  vendor_id: string;
  name: string;
  price: number;
  vendor_profiles: {
    id: string;
    slug?: string | null;
    business_name: string;
    city: string;
    state: string;
    logo_url?: string;
    average_rating: number;
    total_reviews: number;
    total_products: number;
    active_deals_count: number;
    minimum_order: number;
    delivery_fee: number;
    average_delivery_time: number;
    offers_delivery: boolean;
    offers_pickup: boolean;
    featured_until?: string;
    promoted_until?: string;
    website?: string | null;
  };
}

export default function StrainDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const vendorsSchema = useVendorsSchema();

  const [strain, setStrain] = useState<Strain | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorBrandingById, setVendorBrandingById] = useState<
    Record<string, { website: string | null; theme: ResolvedSkuCardTheme }>
  >({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [offersOpen, setOffersOpen] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offers, setOffers] = useState<
    {
      product_id: string;
      vendor_id: string;
      vendor_slug: string | null;
      vendor_name: string;
      vendor_city: string | null;
      vendor_state: string | null;
      price_cents: number;
    }[]
  >([]);

  const zip5 = useMemo(() => readShopperZip5(), []);

  useEffect(() => {
    if (slug) {
      loadStrain();
    }
  }, [slug]);

  useEffect(() => {
    if (!strain?.id || !strain.slug) return;
    void trackEvent({
      eventType: "strain_page_view",
      metadata: { strain_id: strain.id, strain_slug: strain.slug },
    });
  }, [strain?.id, strain?.slug]);

  useEffect(() => {
    if (!vendorsSchema || products.length === 0) {
      setVendorBrandingById({});
      return;
    }
    const ids = Array.from(new Set(products.map((p) => p.vendor_profiles.id)));
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select(
          "id,website,sku_card_preset,sku_card_background_url,sku_card_overlay_opacity,store_listing_card_preset,store_listing_card_background_url,store_listing_card_overlay_opacity"
        )
        .in("id", ids);
      if (cancelled || error) return;
      const m: Record<string, { website: string | null; theme: ResolvedSkuCardTheme }> = {};
      for (const row of data || []) {
        const r = row as {
          id: string;
          website?: string | null;
          sku_card_preset?: string | null;
          sku_card_background_url?: string | null;
          sku_card_overlay_opacity?: number | null;
          store_listing_card_preset?: string | null;
          store_listing_card_background_url?: string | null;
          store_listing_card_overlay_opacity?: number | null;
        };
        m[r.id] = {
          website: typeof r.website === "string" && r.website.trim() ? r.website.trim() : null,
          theme: resolveStoreListingCardTheme(r),
        };
      }
      setVendorBrandingById(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [products, vendorsSchema]);

  async function loadStrain() {
    try {
      const { data: strainData, error: strainError } = await supabase
        .from("strains")
        .select("*")
        .eq("slug", slug)
        .single();

      if (strainError) throw strainError;
      setStrain(strainData);

      const { data: productsData, error: productsError } = await supabase
        .from("vendor_products")
        .select(
          `
          *,
          vendor_profiles!inner(*)
        `
        )
        .eq("strain_id", strainData.id)
        .eq("stock_status", "in_stock")
        .eq("vendor_profiles.is_approved", true)
        .eq("vendor_profiles.is_live", true)
        .limit(6);

      if (!productsError) {
        setProducts(productsData || []);
      }
    } catch (error) {
      console.error("Error loading strain:", error);
    } finally {
      setLoading(false);
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "indica":
        return "border-purple-500/40 bg-purple-500/15 text-purple-200";
      case "sativa":
        return "border-orange-500/40 bg-orange-500/15 text-orange-200";
      case "hybrid":
        return "border-blue-500/40 bg-blue-500/15 text-blue-200";
      default:
        return "border-gray-600 bg-gray-800 text-gray-200";
    }
  };

  const getBestTimeIcon = (time: string) => {
    const icons = {
      morning: "☀️",
      daytime: "🌤️",
      afternoon: "🌅",
      evening: "🌙",
      night: "🌛",
      anytime: "⏰",
    };
    return icons[time as keyof typeof icons] || "⏰";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TreehouseSmokingLoader label="Loading strain…" />
      </div>
    );
  }

  if (!strain) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="border-green-900/30 bg-gray-900 p-12 text-center">
            <p className="mb-4 text-lg text-gray-300">Strain not found</p>
            <Link href="/strains">
              <Button className="bg-green-600 text-white hover:bg-green-700">Back to Strains</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const uniqueVendors = Array.from(
    new Map(products.map((p) => [p.vendor_profiles.id, p.vendor_profiles])).values()
  );

  async function loadOffers() {
    const z = zip5;
    if (!strain) return;
    if (!z || z.length !== 5) return;
    setOffersLoading(true);
    try {
      const res = await fetch(
        `/api/strains/offers?slug=${encodeURIComponent(strain.slug)}&zip=${encodeURIComponent(z)}`,
        { cache: "no-store" }
      );
      const data = (await res.json()) as { offers?: any[] };
      const rows = Array.isArray(data.offers) ? data.offers : [];
      setOffers(rows);
      if (rows.length === 0) {
        toast({
          title: "Not in your area",
          description: "This strain isn’t being sold in your area right now.",
        });
        setOffersOpen(false);
      } else {
        setOffersOpen(true);
      }
    } catch {
      toast({ title: "Couldn’t load nearby offers", description: "Try again in a moment." });
    } finally {
      setOffersLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/strains">
          <Button variant="ghost" className="mb-6 gap-2 text-gray-300 hover:bg-white/10 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Strains
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="aspect-[21/9] max-h-80 w-full overflow-hidden rounded-2xl bg-background shadow-sm">
              <StrainHeroImage
                slug={strain.slug}
                imageUrl={strain.image_url}
                alt={strain.name}
                className="h-full w-full"
                fallbackTone="dark"
                photoFit="contain"
                strainDetailPage
                cornerBrandMark={strainRowHasCatalogPhoto(strain)}
              />
            </div>
            <Card className="border-green-900/25 bg-gradient-to-br from-gray-900 to-black p-8 text-gray-100">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <h1 className="text-4xl font-bold text-white">{strain.name}</h1>
                    {strain.is_trending && (
                      <Badge className="bg-rose-500 text-white">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Trending
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className={getTypeColor(strain.type)}>
                    {strain.type.charAt(0).toUpperCase() + strain.type.slice(1)}
                  </Badge>
                  <StrainStarAverage
                    className="mt-3"
                    size="md"
                    value={strainDisplayAverageRating(strain.slug, strain, strain.rating)}
                    reviewCount={displayStrainReviewCountForPhotoCard(
                      strain.slug,
                      strain,
                      Number(strain.review_count) || 0
                    )}
                  />
                </div>
                <div className="shrink-0">
                  <Button
                    onClick={loadOffers}
                    disabled={offersLoading}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Find this strain near you
                  </Button>
                </div>
              </div>

              <p className="mb-8 text-lg leading-relaxed text-gray-300">{strain.description}</p>

              <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="border-emerald-800/40 bg-emerald-950/30 p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-green-400" />
                    <h3 className="font-semibold text-white">THC Content</h3>
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    {strain.thc_min}% - {strain.thc_max}%
                  </p>
                </Card>

                <Card className="border-blue-800/40 bg-blue-950/30 p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-blue-400" />
                    <h3 className="font-semibold text-white">CBD Content</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">
                    {strain.cbd_min}% - {strain.cbd_max}%
                  </p>
                </Card>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 text-xl font-semibold text-white">Effects</h3>
                  <div className="flex flex-wrap gap-2">
                    {strain.effects.map((effect) => (
                      <Badge
                        key={effect}
                        variant="secondary"
                        className="border-green-800/40 bg-green-950/50 px-4 py-2 text-sm text-green-100"
                      >
                        {formatStrainEffectForDisplay(effect)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xl font-semibold text-white">Flavor Profile</h3>
                  <div className="flex flex-wrap gap-2">
                    {strain.flavors.map((flavor) => (
                      <Badge
                        key={flavor}
                        variant="outline"
                        className="border-gray-600 px-4 py-2 text-sm text-gray-200"
                      >
                        {flavor}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xl font-semibold text-white">Best Time to Use</h3>
                  <Card className="border-gray-700 bg-gray-950/80 p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {getBestTimeIcon(strain.best_time)}
                      </span>
                      <div>
                        <p className="font-semibold capitalize text-white">{strain.best_time}</p>
                        <p className="text-sm text-gray-400">
                          {strain.best_time === "daytime"
                            ? "Great for staying active and productive"
                            : strain.best_time === "evening"
                            ? "Perfect for unwinding after work"
                            : strain.best_time === "night"
                            ? "Ideal for relaxation and sleep"
                            : "Versatile for any time of day"}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-8 border-green-900/25 bg-gradient-to-br from-gray-900 to-black p-6">
              <h3 className="mb-4 text-xl font-semibold text-white">Quick Facts</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Leaf className="mt-0.5 h-5 w-5 text-green-400" />
                  <div>
                    <p className="font-medium text-white">Strain Type</p>
                    <p className="capitalize text-gray-400">{strain.type}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-green-400" />
                  <div>
                    <p className="font-medium text-white">Best Time</p>
                    <p className="capitalize text-gray-400">{strain.best_time}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 text-green-400" />
                  <div>
                    <p className="font-medium text-white">Primary Effects</p>
                    <p className="text-gray-400">
                      {strain.effects
                        .slice(0, 3)
                        .map((e) => formatStrainEffectForDisplay(e))
                        .join(", ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-green-400" />
                  <div>
                    <p className="font-medium text-white">Availability</p>
                    <p className="text-gray-400">
                      {uniqueVendors.length} vendor{uniqueVendors.length !== 1 && "s"} nearby
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {uniqueVendors.length > 0 && (
          <div>
            <h2 className="mb-6 text-3xl font-bold text-white">Vendors Near You</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {uniqueVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  distance={Math.random() * 10 + 0.5}
                  isOpen={true}
                  tone="dark"
                  listingCardTheme={vendorBrandingById[vendor.id]?.theme}
                />
              ))}
            </div>
          </div>
        )}

        {uniqueVendors.length === 0 && (
          <Card className="border-green-900/25 bg-gray-900 p-12 text-center">
            <p className="mb-4 text-lg text-gray-400">No vendors currently offering this strain</p>
            <Link href="/discover">
              <Button className="bg-green-600 text-white hover:bg-green-700">Browse All Vendors</Button>
            </Link>
          </Card>
        )}
      </div>

      <Dialog open={offersOpen} onOpenChange={setOffersOpen}>
        <DialogContent className="max-w-xl border-green-900/40 bg-gray-950 text-gray-100">
          <DialogHeader>
            <DialogTitle className="text-white">Cheapest nearby options</DialogTitle>
            <DialogDescription className="text-gray-400">
              {zip5 ? `Based on ZIP ${zip5}.` : "Based on your area."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {offers.map((o) => (
              <Link
                key={`${o.vendor_id}:${o.product_id}`}
                href={`${listingHrefForVendor({ id: o.vendor_id, slug: o.vendor_slug })}?product=${encodeURIComponent(o.product_id)}`}
                className="block rounded-lg border border-green-900/30 bg-gray-900/80 px-4 py-3 transition hover:border-green-600/50 hover:bg-gray-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">{o.vendor_name}</div>
                    <div className="truncate text-sm text-gray-400">
                      {(o.vendor_city || "").trim()}
                      {o.vendor_city && o.vendor_state ? ", " : ""}
                      {(o.vendor_state || "").trim()}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-bold text-green-400">
                      ${(Math.max(0, Number(o.price_cents) || 0) / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">View menu</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

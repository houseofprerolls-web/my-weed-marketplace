"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VendorCard } from "@/components/vendors/VendorCard";
import { Leaf, Clock, Sparkles, MapPin, ArrowLeft, Loader as Loader2 } from "lucide-react";
import { StrainHeroImage } from "@/components/strains/StrainHeroImage";
import { trackEvent } from "@/lib/analytics";

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
}

interface Product {
  id: string;
  vendor_id: string;
  name: string;
  price: number;
  vendor_profiles: {
    id: string;
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
  };
}

export default function StrainDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [strain, setStrain] = useState<Strain | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "sativa":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "hybrid":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
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
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!strain) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-12 text-center">
            <p className="text-lg text-slate-600 mb-4">Strain not found</p>
            <Link href="/strains">
              <Button>Back to Strains</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const uniqueVendors = Array.from(
    new Map(products.map((p) => [p.vendor_profiles.id, p.vendor_profiles])).values()
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/strains">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Strains
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="aspect-[21/9] max-h-80 w-full overflow-hidden rounded-2xl bg-slate-200 shadow-sm">
              <StrainHeroImage
                slug={strain.slug}
                imageUrl={strain.image_url}
                alt={strain.name}
                className="h-full w-full"
                imgClassName="h-full w-full object-cover"
                fallbackTone="light"
              />
            </div>
            <Card className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-4xl font-bold text-slate-900">{strain.name}</h1>
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
                </div>
              </div>

              <p className="text-lg text-slate-700 leading-relaxed mb-8">
                {strain.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="p-6 bg-emerald-50 border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-slate-900">THC Content</h3>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {strain.thc_min}% - {strain.thc_max}%
                  </p>
                </Card>

                <Card className="p-6 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-slate-900">CBD Content</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {strain.cbd_min}% - {strain.cbd_max}%
                  </p>
                </Card>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">Effects</h3>
                  <div className="flex flex-wrap gap-2">
                    {strain.effects.map((effect) => (
                      <Badge
                        key={effect}
                        variant="secondary"
                        className="text-sm py-2 px-4"
                      >
                        {effect}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    Flavor Profile
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {strain.flavors.map((flavor) => (
                      <Badge
                        key={flavor}
                        variant="outline"
                        className="text-sm py-2 px-4"
                      >
                        {flavor}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    Best Time to Use
                  </h3>
                  <Card className="p-4 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {getBestTimeIcon(strain.best_time)}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 capitalize">
                          {strain.best_time}
                        </p>
                        <p className="text-sm text-slate-600">
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
            <Card className="p-6 sticky top-8">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Quick Facts</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Leaf className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">Strain Type</p>
                    <p className="text-slate-600 capitalize">{strain.type}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">Best Time</p>
                    <p className="text-slate-600 capitalize">{strain.best_time}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">Primary Effects</p>
                    <p className="text-slate-600">
                      {strain.effects.slice(0, 3).join(", ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">Availability</p>
                    <p className="text-slate-600">
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
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Vendors Near You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {uniqueVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  distance={Math.random() * 10 + 0.5}
                  isOpen={true}
                />
              ))}
            </div>
          </div>
        )}

        {uniqueVendors.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-lg text-slate-600 mb-4">
              No vendors currently offering this strain
            </p>
            <Link href="/discover">
              <Button>Browse All Vendors</Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { VendorCard } from "@/components/vendors/VendorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Map as MapIcon, List, Loader as Loader2, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import Map from "@/components/Map";
import { DemoBanner } from "@/components/demo/DemoBanner";

type FilterType = "all" | "open" | "deals" | "delivery" | "pickup" | "highest-rated";
type SortType = "best-match" | "highest-rated" | "distance" | "most-popular" | "newest";
type ViewMode = "list" | "map";

interface Vendor {
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
  created_at: string;
}

export default function DiscoverPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("best-match");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [vendors, searchQuery, activeFilter, sortBy]);

  async function loadVendors() {
    try {
      const { data, error } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("is_approved", true)
        .eq("approval_status", "approved");

      if (error) throw error;

      setVendors(data || []);
    } catch (error) {
      console.error("Error loading vendors:", error);
    } finally {
      setLoading(false);
    }
  }

  function applyFiltersAndSort() {
    let filtered = [...vendors];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.business_name.toLowerCase().includes(query) ||
          v.city.toLowerCase().includes(query)
      );
    }

    if (activeFilter === "open") {
      filtered = filtered.filter((v) => isVendorOpen(v.id));
    } else if (activeFilter === "deals") {
      filtered = filtered.filter((v) => v.active_deals_count > 0);
    } else if (activeFilter === "delivery") {
      filtered = filtered.filter((v) => v.offers_delivery);
    } else if (activeFilter === "pickup") {
      filtered = filtered.filter((v) => v.offers_pickup);
    } else if (activeFilter === "highest-rated") {
      filtered = filtered.filter((v) => v.average_rating >= 4.5);
    }

    switch (sortBy) {
      case "highest-rated":
        filtered.sort((a, b) => b.average_rating - a.average_rating);
        break;
      case "distance":
        filtered.sort((a, b) => Math.random() - 0.5);
        break;
      case "most-popular":
        filtered.sort((a, b) => b.total_reviews - a.total_reviews);
        break;
      case "newest":
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "best-match":
      default:
        filtered.sort((a, b) => {
          const aFeatured = a.featured_until && new Date(a.featured_until) > new Date() ? 1 : 0;
          const bFeatured = b.featured_until && new Date(b.featured_until) > new Date() ? 1 : 0;
          if (aFeatured !== bFeatured) return bFeatured - aFeatured;
          return b.average_rating - a.average_rating;
        });
    }

    setFilteredVendors(filtered);
    setPage(1);
  }

  function isVendorOpen(vendorId: string): boolean {
    const hour = new Date().getHours();
    return hour >= 9 && hour < 22;
  }

  const paginatedVendors = filteredVendors.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = filteredVendors.length > paginatedVendors.length;

  const filters: Array<{ value: FilterType; label: string; count?: number }> = [
    { value: "all", label: "All Vendors" },
    { value: "open", label: "Open Now", count: vendors.filter((v) => isVendorOpen(v.id)).length },
    {
      value: "highest-rated",
      label: "Highest Rated",
      count: vendors.filter((v) => v.average_rating >= 4.5).length,
    },
    {
      value: "deals",
      label: "Deals Available",
      count: vendors.filter((v) => v.active_deals_count > 0).length,
    },
    {
      value: "delivery",
      label: "Delivery",
      count: vendors.filter((v) => v.offers_delivery).length,
    },
    {
      value: "pickup",
      label: "Pickup",
      count: vendors.filter((v) => v.offers_pickup).length,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Discover Dispensaries</h1>
          <p className="text-lg text-slate-600">
            Find trusted dispensaries and delivery services near you
          </p>
        </div>

        <DemoBanner />

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              className="gap-2"
            >
              <List className="w-4 h-4" />
              List
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              onClick={() => setViewMode("map")}
              className="gap-2"
            >
              <MapIcon className="w-4 h-4" />
              Map
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <SlidersHorizontal className="w-4 h-4" />
            <span className="font-medium">Filter:</span>
          </div>

          {filters.map((filter) => (
            <Badge
              key={filter.value}
              variant={activeFilter === filter.value ? "default" : "outline"}
              className={`cursor-pointer transition-all ${
                activeFilter === filter.value
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "hover:border-emerald-600 hover:text-emerald-600"
              }`}
              onClick={() => setActiveFilter(filter.value)}
            >
              {filter.label}
              {filter.count !== undefined && filter.count > 0 && (
                <span className="ml-1.5 opacity-75">({filter.count})</span>
              )}
            </Badge>
          ))}
        </div>

        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {filteredVendors.length} {filteredVendors.length === 1 ? "result" : "results"}
          </p>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="best-match">Best Match</SelectItem>
              <SelectItem value="highest-rated">Highest Rated</SelectItem>
              <SelectItem value="distance">Distance</SelectItem>
              <SelectItem value="most-popular">Most Popular</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : viewMode === "list" ? (
          <>
            {filteredVendors.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg text-slate-600">No vendors found matching your filters.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setActiveFilter("all");
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedVendors.map((vendor) => (
                    <VendorCard
                      key={vendor.id}
                      vendor={vendor}
                      distance={Math.random() * 10 + 0.5}
                      isOpen={isVendorOpen(vendor.id)}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-8 text-center">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setPage(page + 1)}
                      className="gap-2"
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <Card className="overflow-hidden" style={{ height: "600px" }}>
            <Map
              center={{ lat: 34.0522, lng: -118.2437 }}
              zoom={11}
              markers={paginatedVendors.map((vendor, idx) => ({
                position: {
                  lat: 34.0522 + (Math.random() - 0.5) * 0.2,
                  lng: -118.2437 + (Math.random() - 0.5) * 0.2,
                },
                title: vendor.business_name,
                id: vendor.id,
              }))}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

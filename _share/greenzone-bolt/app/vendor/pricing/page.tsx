"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, CircleAlert as AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import VendorNav from "@/components/vendor/VendorNav";
import { UpgradeRequestButton } from "@/components/vendor/UpgradeRequestButton";

const PLANS = [
  {
    name: "Starter Plan",
    price: 99,
    interval: "month",
    description: "Perfect for new vendors getting started on the platform",
    popular: false,
    features: [
      { name: "Business listing", included: true },
      { name: "Basic photo uploads (up to 10)", included: true },
      { name: "Product menu management", included: true },
      { name: "Basic analytics dashboard", included: true },
      { name: "Customer reviews & ratings", included: true },
      { name: "Email support", included: true },
      { name: "Verified vendor badge", included: false },
      { name: "Priority search placement", included: false },
      { name: "Deals posting tools", included: false },
      { name: "Homepage visibility", included: false },
      { name: "Video uploads", included: false },
      { name: "API integration", included: false },
      { name: "Multi-location management", included: false },
      { name: "Dedicated support", included: false }
    ]
  },
  {
    name: "Growth Plan",
    price: 299,
    interval: "month",
    description: "Ideal for established vendors looking to expand their reach",
    popular: true,
    features: [
      { name: "Business listing", included: true },
      { name: "Unlimited photo uploads", included: true },
      { name: "Product menu management", included: true },
      { name: "Advanced analytics dashboard", included: true },
      { name: "Customer reviews & ratings", included: true },
      { name: "Verified vendor badge", included: true },
      { name: "Priority search placement", included: true },
      { name: "Deals posting tools (up to 10)", included: true },
      { name: "Review response tools", included: true },
      { name: "Social media integration", included: true },
      { name: "Priority email support", included: true },
      { name: "Homepage visibility", included: false },
      { name: "Video uploads", included: false },
      { name: "API integration", included: false },
      { name: "Multi-location management", included: false },
      { name: "Dedicated support", included: false }
    ]
  },
  {
    name: "Premium Plan",
    price: 599,
    interval: "month",
    description: "Complete platform access for top-tier vendors",
    popular: false,
    features: [
      { name: "Business listing", included: true },
      { name: "Unlimited photo & video uploads", included: true },
      { name: "Product menu management", included: true },
      { name: "Premium analytics dashboard", included: true },
      { name: "Customer reviews & ratings", included: true },
      { name: "Verified vendor badge", included: true },
      { name: "Top priority search placement", included: true },
      { name: "Unlimited deals posting", included: true },
      { name: "Review response tools", included: true },
      { name: "Social media integration", included: true },
      { name: "Homepage featured visibility", included: true },
      { name: "Banner ad placements", included: true },
      { name: "API integration capability", included: true },
      { name: "Multi-location management", included: true },
      { name: "Dedicated account manager", included: true }
    ]
  }
];

export default function VendorPricingPage() {
  const { user } = useAuth();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");

  // Only show to logged-in vendors
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <VendorNav />
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to view vendor pricing plans. This page is for registered vendors only.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNav />

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Vendor Plan Comparison – Visible Only to Registered Vendors
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Select the perfect plan to grow your cannabis delivery business on Green Zone
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                billingInterval === "monthly"
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("annual")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                billingInterval === "annual"
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Annual
              <span className="ml-2 text-xs text-green-600 font-semibold">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
          {PLANS.map((plan) => {
            const displayPrice = billingInterval === "annual"
              ? Math.floor(plan.price * 0.8)
              : plan.price;

            return (
              <Card
                key={plan.name}
                className={`relative ${
                  plan.popular
                    ? "border-green-600 shadow-xl scale-105"
                    : "border-gray-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <Badge className="bg-green-600 text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">{plan.description}</CardDescription>
                  <div className="mt-6">
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-bold">${displayPrice}</span>
                      <span className="text-gray-500 ml-2">/{billingInterval === "annual" ? "mo" : "month"}</span>
                    </div>
                    {billingInterval === "annual" && (
                      <p className="text-sm text-green-600 mt-2">
                        Billed ${displayPrice * 12} annually
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-5 w-5 text-gray-300 mr-3 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={feature.included ? "text-gray-900" : "text-gray-400"}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <UpgradeRequestButton
                    requestContext={`Pricing — ${plan.name} (${billingInterval})`}
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                  >
                    Get Started
                  </UpgradeRequestButton>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { subscriptionPlans, placementOptions } from '@/lib/demo-data';
import { CircleCheck as CheckCircle, Star, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gradient-to-b from-green-950/30 to-black py-16 border-b border-green-900/20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-green-600/20 text-green-500 border-green-600/30 mb-4">
            Grow Your Business
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Join 1,200+ cannabis businesses reaching thousands of customers every day
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Subscription Plans */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Monthly Subscription Plans</h2>
            <p className="text-gray-400">Choose the plan that fits your business needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {subscriptionPlans.map((plan) => (
              <Card
                key={plan.id}
                className={`bg-gradient-to-br from-gray-900 to-black p-8 ${
                  plan.recommended
                    ? 'border-green-600 border-2 relative'
                    : 'border-green-900/20'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-green-600 text-white border-green-600">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-4">
                    <span className="text-5xl font-bold text-white">${plan.price}</span>
                    <span className="text-gray-400">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/vendor/onboarding">
                  <Button
                    className={`w-full ${
                      plan.recommended
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-800 hover:bg-gray-700'
                    } text-white`}
                  >
                    Get Started
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>

        {/* Placement Options */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Featured Placements</h2>
            <p className="text-gray-400">Boost your visibility with premium advertising options</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {placementOptions.map((placement) => (
              <Card
                key={placement.id}
                className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{placement.name}</h3>
                    <p className="text-gray-400 text-sm">{placement.description}</p>
                  </div>
                  <div className="bg-green-600/20 p-3 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-white">${placement.price}</span>
                  <span className="text-gray-400">/{placement.period}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-800/50 rounded-lg">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Impressions</p>
                    <p className="text-white font-semibold">{placement.impressions}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Avg CTR</p>
                    <p className="text-green-500 font-semibold">{placement.avgCTR}</p>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {placement.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button className="w-full bg-gray-800 hover:bg-gray-700 text-white">
                  Learn More
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Trust Section */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-green-950/30 to-black border-green-900/20 p-8 md:p-12">
            <div className="text-center">
              <Zap className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Grow Your Business?
              </h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                Join the leading cannabis marketplace and connect with thousands of customers actively searching for businesses like yours.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/vendor/onboarding">
                  <Button className="bg-green-600 hover:bg-green-700 text-white px-8">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto mt-16">
          <div className="text-center">
            <p className="text-4xl font-bold text-white mb-2">1,200+</p>
            <p className="text-gray-400">Active Vendors</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-white mb-2">50k+</p>
            <p className="text-gray-400">Monthly Visitors</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-white mb-2">2M+</p>
            <p className="text-gray-400">Customer Reviews</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-white mb-2">98%</p>
            <p className="text-gray-400">Satisfaction Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}

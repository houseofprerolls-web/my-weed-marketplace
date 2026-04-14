"use client";

import { Card } from '@/components/ui/card';
import { Search, ShoppingCart, Truck, CircleCheck as CheckCircle } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'Find Services',
    description: 'Search for cannabis delivery services in your area and browse their menus',
  },
  {
    icon: ShoppingCart,
    title: 'Add to Cart',
    description: 'Select your products and add them to your cart with just a few clicks',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    description: 'Your order is prepared and delivered to your door in 30-60 minutes',
  },
  {
    icon: CheckCircle,
    title: 'Enjoy',
    description: 'Receive your premium cannabis products and enjoy responsibly',
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-gray-400 text-lg">
            Get cannabis delivered in 4 simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={index} className="relative bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-8 text-center">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>

                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-green-600/20 rounded-2xl">
                    <Icon className="h-8 w-8 text-green-500" />
                  </div>
                </div>

                <h3 className="text-white font-semibold text-xl mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

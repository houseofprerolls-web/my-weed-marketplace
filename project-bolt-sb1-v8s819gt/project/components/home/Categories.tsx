"use client";

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Flower, Cookie, Cigarette, Sparkles, Droplet, Leaf } from 'lucide-react';

const categories = [
  { name: 'Flower', icon: Flower, slug: 'flower', color: 'from-green-600 to-green-700' },
  { name: 'Edibles', icon: Cookie, slug: 'edibles', color: 'from-orange-600 to-orange-700' },
  { name: 'Vapes', icon: Cigarette, slug: 'vapes', color: 'from-blue-600 to-blue-700' },
  { name: 'Pre-Rolls', icon: Sparkles, slug: 'pre-rolls', color: 'from-purple-600 to-purple-700' },
  { name: 'Concentrates', icon: Droplet, slug: 'concentrates', color: 'from-yellow-600 to-yellow-700' },
  { name: 'CBD', icon: Leaf, slug: 'cbd', color: 'from-teal-600 to-teal-700' },
];

export function Categories() {
  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Shop by Category
          </h2>
          <p className="text-gray-400 text-lg">
            Find exactly what you're looking for
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link key={category.slug} href={`/directory?category=${category.slug}`}>
                <Card className="group relative overflow-hidden bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition-all duration-300 cursor-pointer h-40">
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity"
                       style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} />

                  <div className="relative h-full flex flex-col items-center justify-center p-6 space-y-3">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${category.color} shadow-lg`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-white font-semibold text-lg">{category.name}</h3>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

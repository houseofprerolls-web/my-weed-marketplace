"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import {
  SMOKERS_CLUB_CATEGORY_IMAGE_OBJECT_POSITION,
  SMOKERS_CLUB_CATEGORY_IMAGE_PATHS,
  type SmokersClubCategorySlug,
} from '@/lib/smokersClubCategory';
import { DaTreehouseCategoryCardBackdrop } from '@/components/datreehouse/DaTreehouseCategoryCardBackdrop';

const categories: { name: string; slug: SmokersClubCategorySlug }[] = [
  { name: 'Flower', slug: 'flower' },
  { name: 'Edibles', slug: 'edibles' },
  { name: 'Pre-Rolls', slug: 'pre-rolls' },
  { name: 'Vapes', slug: 'vapes' },
  { name: 'Concentrates', slug: 'concentrates' },
  { name: 'CBD', slug: 'cbd' },
];

const THUMB_PX = 112;

export function Categories() {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Shop by Category
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => {
            const src = SMOKERS_CLUB_CATEGORY_IMAGE_PATHS[category.slug];
            const objectPosition =
              SMOKERS_CLUB_CATEGORY_IMAGE_OBJECT_POSITION[category.slug] ?? '50% 50%';
            return (
              <Link key={category.slug} href={`/smokers-club/category/${category.slug}`}>
                <Card className="group relative h-40 cursor-pointer overflow-hidden rounded-2xl border-amber-500/25 bg-background shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_20px_70px_-28px_rgba(245,158,11,0.14)] ring-1 ring-amber-500/20 transition-all duration-300 hover:border-brand-red/35 hover:ring-brand-red/25">
                  <DaTreehouseCategoryCardBackdrop variant="tile" />

                  <div className="relative z-[1] flex h-full flex-col items-center justify-center space-y-3 p-6">
                    <span className="relative h-[7rem] w-[7rem] shrink-0 overflow-hidden rounded-full bg-zinc-900 ring-2 ring-white/15 shadow-lg transition group-hover:ring-brand-lime/35">
                      <Image
                        src={src}
                        alt=""
                        role="presentation"
                        width={THUMB_PX * 2}
                        height={THUMB_PX * 2}
                        className="h-full w-full object-cover"
                        style={{ objectPosition }}
                        sizes="(max-width: 768px) 33vw, 112px"
                      />
                    </span>
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

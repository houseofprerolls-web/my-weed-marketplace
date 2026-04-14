'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRole } from '@/hooks/useRole';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { BookOpen, Leaf, Package, AlertCircle, Sparkles } from 'lucide-react';

export default function AdminCatalogHubPage() {
  const { isAdmin, loading } = useRole();
  const vendorsSchema = useVendorsSchema();

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center p-6">
        <Card className="max-w-md border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h1 className="text-lg font-semibold text-white">Access denied</h1>
        </Card>
      </div>
    );
  }

  const items = [
    {
      href: '/admin/strains',
      title: 'Strain directory',
      description: 'Strains, photos, and descriptions for menus and discovery.',
      icon: Leaf,
      show: true,
    },
    {
      href: '/admin/master-catalog',
      title: 'Master brand catalog',
      description: 'SKUs and catalog lines tied to vendors.',
      icon: Package,
      show: vendorsSchema,
    },
    {
      href: '/admin/brand-pages',
      title: 'Brand showcase pages',
      description: 'Public /brands/[slug] content, themes, and page editors.',
      icon: Sparkles,
      show: true,
    },
  ].filter((x) => x.show);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
          <BookOpen className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Catalog</h1>
          <p className="text-sm text-zinc-400">Strains and product catalog tooling.</p>
        </div>
      </div>
      <ul className="space-y-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Card className="border-zinc-800 bg-zinc-900/50 p-5 ring-1 ring-zinc-800/80">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-4">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
                    <div>
                      <h2 className="font-semibold text-white">{item.title}</h2>
                      <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
                    </div>
                  </div>
                  <Button asChild className="shrink-0 bg-cyan-800 text-white hover:bg-cyan-700">
                    <Link href={item.href}>Open</Link>
                  </Button>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminSmokersClubBannersPanel } from '@/components/admin/AdminSmokersClubBannersPanel';
import { AdminFeaturesPanel } from '@/components/admin/AdminFeaturesPanel';
import { AdminSmokersClubRankingPanel } from '@/components/admin/AdminSmokersClubRankingPanel';
import { ArrowLeft } from 'lucide-react';
import { marketplaceCopy } from '@/lib/marketplaceCopy';

export default function AdminSmokersClubPage() {
  const { loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const vendorsSchema = useVendorsSchema();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-gray-400">Loading…</div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="border-red-900/30 bg-gray-900 p-8 text-white">Access denied</Card>
      </div>
    );
  }
  if (!vendorsSchema) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-gray-400">Enable NEXT_PUBLIC_USE_VENDORS_TABLE=1 for Smokers Club admin.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 text-white md:p-8">
      <div className="mx-auto max-w-5xl">
        <Button asChild variant="ghost" className="mb-6 text-gray-400">
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Admin
          </Link>
        </Button>
        <h1 className="mb-2 text-3xl font-bold">Smokers Club &amp; placements</h1>
        <p className="mb-6 text-gray-400">{marketplaceCopy.adminSmokersIntro}</p>

        <Tabs defaultValue="features" className="space-y-6">
          <TabsList className="flex flex-wrap border border-green-900/30 bg-gray-900/80">
            <TabsTrigger value="features">Feature slots</TabsTrigger>
            <TabsTrigger value="ranking">Daily ranking</TabsTrigger>
            <TabsTrigger value="banners">Ad slideshows</TabsTrigger>
          </TabsList>

          <TabsContent value="features">
            <AdminFeaturesPanel showHelpLink={false} />
          </TabsContent>

          <TabsContent value="ranking">
            <AdminSmokersClubRankingPanel />
          </TabsContent>

          <TabsContent value="banners">
            <AdminSmokersClubBannersPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

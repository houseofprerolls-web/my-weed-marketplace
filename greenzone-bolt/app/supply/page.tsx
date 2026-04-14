'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useSupplyPortalAccess } from '@/hooks/useSupplyPortalAccess';

export default function SupplyPortalHomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { canAccessAdminDashboard } = useRole();
  const { assignments, loading, mayAccess } = useSupplyPortalAccess(user?.id, {
    treatAsAdmin: canAccessAdminDashboard,
  });

  useEffect(() => {
    if (loading || !mayAccess) return;
    if (assignments.length === 1) {
      router.replace(`/supply/${assignments[0]!.supply_account_id}/dashboard`);
    }
  }, [loading, mayAccess, assignments, router]);

  if (loading || !mayAccess) return null;

  if (assignments.length === 1) {
    return (
      <div className="flex justify-center py-16 text-zinc-500 text-sm">Opening your workspace…</div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Your supply accounts</h1>
      <ul className="grid gap-4 sm:grid-cols-2">
        {assignments.map((a) => (
          <li key={a.supply_account_id}>
            <Link href={`/supply/${a.supply_account_id}/dashboard`}>
              <Card className="border-zinc-800 bg-zinc-900 p-4 transition hover:border-green-700/40">
                <h2 className="font-semibold text-white">{a.account_name}</h2>
                <p className="mt-1 text-xs text-zinc-500">Role: {a.role}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

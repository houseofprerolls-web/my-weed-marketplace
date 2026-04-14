import { AdminRegionProvider } from '@/contexts/AdminRegionContext';
import { AdminAppShell } from '@/components/admin/AdminAppShell';

export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRegionProvider>
      <AdminAppShell>{children}</AdminAppShell>
    </AdminRegionProvider>
  );
}

import { treehouseAuthPageShell } from '@/lib/treehouseAuthPortal';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={treehouseAuthPageShell}>
      <div className="flex min-h-screen flex-col">{children}</div>
    </div>
  );
}

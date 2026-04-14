import { Suspense } from 'react';
import { LoginView } from './LoginView';

export default function AuthLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
          Loading…
        </div>
      }
    >
      <LoginView />
    </Suspense>
  );
}

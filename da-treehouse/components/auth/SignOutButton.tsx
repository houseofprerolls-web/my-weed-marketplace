"use client";

import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        const supabase = createBrowserSupabase();
        await supabase.auth.signOut();
        router.refresh();
        router.push("/");
      }}
    >
      Sign out
    </Button>
  );
}

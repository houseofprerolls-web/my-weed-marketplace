"use client";

import { useDemo } from "@/contexts/DemoContext";
import { CircleAlert as AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DemoBanner() {
  const { isDemoMode } = useDemo();

  if (!isDemoMode) {
    return null;
  }

  return (
    <Alert className="mb-6 bg-blue-50 border-blue-200">
      <AlertCircle className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-900">
        This is a demonstration environment. All vendor data and order activity shown are simulated for demonstration purposes.
      </AlertDescription>
    </Alert>
  );
}

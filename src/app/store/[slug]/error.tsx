"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Store-scoped error boundary, same shape as the root error.tsx — deliberately plain
 * hardcoded English (not next-intl) since this page must never itself be able to throw.
 * Never shown to the customer: stack traces, error codes, or any server detail.
 */
export default function StoreErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[store-error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="max-w-sm space-y-3 rounded-lg border p-6 text-center">
        <h1 className="font-medium">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">This store ran into an unexpected problem. Please try again.</p>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}

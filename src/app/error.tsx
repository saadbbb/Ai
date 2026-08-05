"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Route-segment error boundary — catches an unhandled throw from any Server
 * or Client Component below the root layout so the user sees this instead
 * of Next's raw crash screen. Deliberately plain hardcoded English (not
 * next-intl) — this page must never itself be able to throw, and this is
 * the one place in the app where depending on locale/message-bundle loading
 * succeeding isn't worth the risk.
 */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="max-w-sm space-y-3 rounded-lg border p-6 text-center">
        <h1 className="font-medium">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. Please try again, or come back in a moment.
        </p>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}

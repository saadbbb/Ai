import { Store } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Catches `getStorefrontData()`'s own `notFound()` — the one case where no merchant
 * branding can exist (the store itself couldn't be resolved). Deliberately plain
 * hardcoded English, same reasoning as the root error.tsx: this file must never
 * itself be able to throw, so it can't depend on locale/message-bundle loading.
 */
export default function StoreNotFound() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="max-w-sm space-y-4 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Store className="size-5" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">Store not found</h1>
          <p className="text-sm text-muted-foreground">This store doesn&apos;t exist or isn&apos;t available right now.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}

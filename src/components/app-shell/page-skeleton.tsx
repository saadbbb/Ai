import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Building blocks for route-level loading.tsx fallbacks. Next wraps each
 * segment's {children} in a Suspense boundary keyed off loading.tsx, so
 * these render instantly on navigation while the dashboard/admin shell
 * (sidebar, topbar) stays mounted untouched — see src/app/dashboard/loading.tsx.
 */

export function HeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      {withAction && <Skeleton className="h-9 w-32 shrink-0" />}
    </div>
  );
}

export function StatTileSkeleton() {
  return (
    <Card className="gap-2 px-4">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-6 w-12" />
    </Card>
  );
}

export function StatGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <StatTileSkeleton key={i} />
      ))}
    </div>
  );
}

export function CardBlockSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <Skeleton className="h-4 flex-1" style={{ maxWidth: `${70 - i * 8}%` }} />
        </div>
      ))}
    </div>
  );
}

export function ChartCardSkeleton() {
  return (
    <Card>
      <div className="px-4">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    </Card>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b p-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Generic default fallback: fits most list/detail dashboard pages reasonably well. */
export function DefaultPageSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton withAction />
      <StatGridSkeleton />
      <CardBlockSkeleton />
    </div>
  );
}

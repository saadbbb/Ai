import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCardSkeleton, HeaderSkeleton, StatGridSkeleton, TableSkeleton } from "@/components/app-shell/page-skeleton";

/** Mirrors the shape of dashboard/analytics/page.tsx so the transition doesn't jump around once real data lands. */
export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton withAction />

      <StatGridSkeleton count={6} className="sm:grid-cols-3 lg:grid-cols-6" />

      <Card>
        <div className="px-4">
          <Skeleton className="h-24 w-full" />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <ChartCardSkeleton key={i} />
        ))}
      </div>

      <TableSkeleton />
    </div>
  );
}

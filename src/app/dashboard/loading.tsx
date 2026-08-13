import { DefaultPageSkeleton } from "@/components/app-shell/page-skeleton";

/**
 * Next auto-wraps DashboardLayout's {children} in a Suspense boundary keyed
 * off this file, so it shows immediately on every /dashboard/* navigation
 * while the layout (sidebar, topbar) above stays mounted and doesn't
 * re-render — that's what stops the previous page from freezing on screen
 * while the next page's data loads. Route segments with their own
 * loading.tsx (e.g. analytics) use that instead of this default.
 */
export default function DashboardLoading() {
  return <DefaultPageSkeleton />;
}

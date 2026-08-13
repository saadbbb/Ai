import { DefaultPageSkeleton } from "@/components/app-shell/page-skeleton";

/** Same Suspense-boundary fix as src/app/dashboard/loading.tsx, for the /admin shell. */
export default function AdminLoading() {
  return <DefaultPageSkeleton />;
}

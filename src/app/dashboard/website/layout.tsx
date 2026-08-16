import { getTranslations } from "next-intl/server";
import { RouteTabs } from "@/components/route-tabs";

/**
 * One consistent tab strip for every Website area — previously Pages/Ads/Reviews were reachable
 * only via small header buttons on the main page while Publish/Appearance/Content/etc. lived as
 * tabs inside the embedded editor, two different navigation systems on one feature. "line" variant
 * here (vs. the editor's own pill-style tabs one level down) keeps the two levels visually distinct.
 */
export default async function WebsiteLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("website.tabs");

  return (
    <div className="space-y-4">
      <RouteTabs
        variant="line"
        tabs={[
          { href: "/dashboard/website", label: t("overview"), exact: true },
          { href: "/dashboard/website/editor", label: t("editor") },
          { href: "/dashboard/website/pages", label: t("pages") },
          { href: "/dashboard/website/ads", label: t("ads") },
          { href: "/dashboard/website/reviews", label: t("reviews") },
        ]}
      />
      {children}
    </div>
  );
}

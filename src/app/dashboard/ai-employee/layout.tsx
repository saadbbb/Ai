import { getTranslations } from "next-intl/server";
import { RouteTabs } from "@/components/route-tabs";

/**
 * AI Employee is one nav destination with three real facets — configure it, teach it,
 * test it — each kept as its own route (own server-side data fetching) but presented
 * as one tabbed page. Knowledge Base and Test AI used to be separate sidebar items;
 * their old URLs now redirect here (see their route folders) so old links keep working.
 */
export default async function AiEmployeeLayout({ children }: { children: React.ReactNode }) {
  const [t, tDashboard] = await Promise.all([getTranslations("settings"), getTranslations("dashboard")]);

  return (
    <div className="space-y-6">
      <RouteTabs
        tabs={[
          { href: "/dashboard/ai-employee", label: t("settingsTab"), exact: true },
          { href: "/dashboard/ai-employee/knowledge", label: tDashboard("knowledgeBaseLink") },
          { href: "/dashboard/ai-employee/test", label: tDashboard("testAiLink") },
        ]}
      />
      {children}
    </div>
  );
}

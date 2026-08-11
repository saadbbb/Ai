import { MessageSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { ExportButtons } from "@/components/export-buttons";

export default async function InboxIndexPage() {
  const t = await getTranslations("inbox.list");
  const tCommon = await getTranslations("common");
  const exportLabels = { csv: tCommon("exportCsv"), excel: tCommon("exportExcel"), pdf: tCommon("exportPdf") };

  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={MessageSquare}
        title={t("selectConversationTitle")}
        description={t("selectConversationDescription")}
        action={<ExportButtons reportPath="/api/reports/conversations" labels={exportLabels} />}
      />
    </div>
  );
}

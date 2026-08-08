import { getTranslations } from "next-intl/server";
import { campaignService } from "@/features/campaigns/services/campaign.service";

interface PageProps {
  params: Promise<{ workspaceId: string; contactId: string }>;
}

export default async function UnsubscribePage({ params }: PageProps) {
  const { workspaceId, contactId } = await params;
  const t = await getTranslations("unsubscribe");

  await campaignService.setMarketingOptOut(workspaceId, contactId, true);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center space-y-3 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">{t("heading")}</h1>
      <p className="text-sm text-muted-foreground">{t("message")}</p>
    </div>
  );
}

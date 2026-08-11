import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import { campaignService } from "@/features/campaigns/services/campaign.service";

interface PageProps {
  params: Promise<{ workspaceId: string; contactId: string }>;
}

export default async function UnsubscribePage({ params }: PageProps) {
  const { workspaceId, contactId } = await params;
  const t = await getTranslations("unsubscribe");

  await campaignService.setMarketingOptOut(workspaceId, contactId, true);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center space-y-4 px-6 py-24 text-center">
      <Logo variant="tile" className="h-12" />
      <CheckCircle2 className="size-8 text-success" />
      <div className="space-y-1.5">
        <h1 className="font-heading text-xl font-semibold text-foreground">{t("heading")}</h1>
        <p className="text-sm text-muted-foreground">{t("message")}</p>
      </div>
    </div>
  );
}

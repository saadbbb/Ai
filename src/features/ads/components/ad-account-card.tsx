import { getTranslations } from "next-intl/server";
import { SettingsCard } from "@/components/settings-card";
import { Button } from "@/components/ui/button";
import type { AdAccount } from "@/db/schema";

export async function AdAccountCard({ adAccount }: { adAccount: AdAccount }) {
  const t = await getTranslations("ads");
  const tCommon = await getTranslations("common");

  return (
    <SettingsCard
      title={t("metaAccountLabel")}
      description={adAccount.status === "connected" ? t("connected") : t("notConnectedHint")}
      actions={
        <Button type="button" variant="outline" size="sm" disabled>
          {tCommon("comingSoon")}
        </Button>
      }
    />
  );
}

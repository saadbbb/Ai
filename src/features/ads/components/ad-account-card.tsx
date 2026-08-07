import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AdAccount } from "@/db/schema";

export async function AdAccountCard({ adAccount }: { adAccount: AdAccount }) {
  const t = await getTranslations("ads");
  const tCommon = await getTranslations("common");

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{t("metaAccountLabel")}</p>
          <p className="text-sm text-muted-foreground">
            {adAccount.status === "connected" ? t("connected") : t("notConnectedHint")}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled>
          {tCommon("comingSoon")}
        </Button>
      </CardContent>
    </Card>
  );
}

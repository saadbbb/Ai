import { getTranslations } from "next-intl/server";
import type { AttributionStat } from "../repository/ad-campaign.repository";

export async function AttributionReport({ stats }: { stats: AttributionStat[] }) {
  const t = await getTranslations("ads.attribution");

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">{t("heading")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      {stats.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("emptyState")}</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {stats.map((stat) => (
            <div key={stat.campaign.id} className="flex items-center justify-between gap-4 p-3 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{stat.campaign.name}</span>
              <span className="shrink-0 text-right text-muted-foreground">
                {t("contactCount", { count: stat.contactCount })} · {t("revenue")}: {stat.revenue.toFixed(2)}
                {stat.spend !== null && <> · {t("spend")}: {stat.spend.toFixed(2)}</>}
                {stat.cpl !== null && <> · {t("cpl")}: {stat.cpl.toFixed(2)}</>}
                {stat.roas !== null && <> · {t("roas")}: {stat.roas.toFixed(2)}x</>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

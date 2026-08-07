import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ChurnRiskRow } from "../services/campaign.service";

const LEVEL_STYLES: Record<string, string> = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-muted-foreground",
};

export async function ChurnRiskList({ rows }: { rows: ChurnRiskRow[] }) {
  const t = await getTranslations("campaigns.churnRisk");
  const topRows = rows.filter((row) => row.risk.level !== "low").slice(0, 10);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">{t("heading")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      {topRows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("emptyState")}</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {topRows.map(({ contact, risk }) => (
            <Link
              key={contact.id}
              href={`/dashboard/contacts/${contact.id}`}
              className="flex items-center justify-between gap-4 p-3 text-sm hover:bg-muted/50"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{contact.fullName}</span>
              <span className={`shrink-0 font-medium ${LEVEL_STYLES[risk.level]}`}>{t(`levels.${risk.level}`)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

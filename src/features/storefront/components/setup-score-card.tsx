import { CheckCircle2, CircleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { computeSetupScore, type SetupScoreInput } from "../lib/setup-score";

export async function SetupScoreCard(input: SetupScoreInput) {
  const t = await getTranslations("website.setupScore");
  const score = computeSetupScore(input);
  const incompleteBlocking = score.items.filter((item) => item.blocking && !item.done);

  return (
    <Card>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          {score.ready ? (
            <CheckCircle2 className="size-4 text-success" />
          ) : (
            <CircleAlert className="size-4 text-warning" />
          )}
          <p className="text-sm font-medium">
            {score.ready ? t("ready") : t("needsAttention", { count: incompleteBlocking.length })}
          </p>
        </div>
        {!score.ready && (
          <ul className="space-y-1 ps-6 text-sm text-muted-foreground">
            {score.items
              .filter((item) => !item.done)
              .map((item) => (
                <li key={item.key} className={cn("list-disc", !item.blocking && "opacity-70")}>
                  {t(`items.${item.key}`)}
                </li>
              ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TOTAL_STEPS = 10;

interface StepShellProps {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
}

export function StepShell({ step, title, description, children }: StepShellProps) {
  const t = useTranslations("common");

  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("stepOf", { step, total: TOTAL_STEPS })}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

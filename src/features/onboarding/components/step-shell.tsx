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
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t("stepOf", { step, total: TOTAL_STEPS })}
          </p>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }, (_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-colors ${index < step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

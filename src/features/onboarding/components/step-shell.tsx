import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Logo className="h-7" />
        <span className="text-xs font-bold text-text-muted">{t("stepOf", { step, total: TOTAL_STEPS })}</span>
      </div>
      <div className="mb-5 flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }, (_, index) => (
          <div
            key={index}
            className={cn(
              "h-[5px] flex-1 rounded-full transition-colors",
              index < step - 1
                ? "bg-gradient-to-r from-primary to-accent"
                : index === step - 1
                  ? "bg-primary"
                  : "bg-surface-elevated"
            )}
          />
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

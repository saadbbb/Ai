import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  default: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
} as const;

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <Card className="gap-2 px-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-text-muted">{label}</p>
        {Icon && (
          <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", TONE_CLASSES[tone])}>
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <p className="font-heading text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </Card>
  );
}

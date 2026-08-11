import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  default: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
} as const;

export interface StatTileProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: keyof typeof TONE_CLASSES;
  href?: string;
}

export function StatTile({ label, value, icon: Icon, tone = "default", href }: StatTileProps) {
  const content = (
    <Card className={cn("gap-2 px-4", href && "transition-shadow hover:shadow-md")}>
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

  if (href) {
    return (
      <Link href={href} className="block transition-transform hover:-translate-y-0.5">
        {content}
      </Link>
    );
  }

  return content;
}

export function StatGrid({ stats, className }: { stats: StatTileProps[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {stats.map((stat) => (
        <StatTile key={stat.label} {...stat} />
      ))}
    </div>
  );
}

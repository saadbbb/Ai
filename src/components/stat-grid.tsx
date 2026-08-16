import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  default: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
} as const;

export interface StatTileProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: keyof typeof TONE_CLASSES;
  href?: string;
  /** "compact" is for secondary/supporting metrics that shouldn't compete visually with the page's primary KPIs. */
  size?: "default" | "compact";
}

export function StatTile({ label, value, icon: Icon, tone = "default", href, size = "default" }: StatTileProps) {
  const isCompact = size === "compact";
  // Numeric/short KPIs ("128", "Trial") read best large; longer strings (channel
  // and product names) need to step down a size or two so they don't blow out
  // the tile's fixed width instead of just looking a little smaller.
  const valueText = String(value);
  const valueSizeClass = isCompact
    ? "text-base leading-snug"
    : valueText.length > 16
      ? "text-sm leading-snug"
      : valueText.length > 10
        ? "text-lg leading-snug"
        : "text-2xl";

  const content = (
    <Card className={cn(isCompact ? "gap-1 px-3 py-3" : "gap-2 px-4", href && "transition-shadow hover:shadow-md")}>
      <div className="flex items-center justify-between gap-2">
        <p className="line-clamp-2 break-words text-xs font-semibold text-text-muted">{label}</p>
        {Icon && (
          <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-[8px]", TONE_CLASSES[tone])}>
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <p
        className={cn(
          "font-heading font-extrabold tabular-nums text-foreground line-clamp-2 break-words",
          valueSizeClass,
        )}
      >
        {value}
      </p>
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

export function StatGrid({ stats, className, size }: { stats: StatTileProps[]; className?: string; size?: "default" | "compact" }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {stats.map((stat) => (
        <StatTile key={stat.label} {...stat} size={stat.size ?? size} />
      ))}
    </div>
  );
}

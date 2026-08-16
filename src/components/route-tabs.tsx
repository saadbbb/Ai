"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface RouteTab {
  href: string;
  label: string;
  exact?: boolean;
}

/**
 * Visually matches ui/tabs.tsx's TabsList/TabsTrigger, but each "tab" is a real route —
 * for splitting one feature across multiple pages (each keeping its own server-side data
 * fetching) while still presenting as one tabbed surface.
 */
export function RouteTabs({ tabs }: { tabs: RouteTab[] }) {
  const pathname = usePathname();

  return (
    <div className="inline-flex h-8 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-all",
              active ? "bg-background text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

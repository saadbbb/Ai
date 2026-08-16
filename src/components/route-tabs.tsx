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
 * fetching) while still presenting as one tabbed surface. `variant="line"` reads as a
 * lighter-weight underline strip — pair with a pill-style `variant="default"` (the
 * component default) one level down so two stacked tab bars don't look identical.
 */
export function RouteTabs({ tabs, variant = "default" }: { tabs: RouteTab[]; variant?: "default" | "line" }) {
  const pathname = usePathname();

  if (variant === "line") {
    return (
      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-input px-1">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="inline-flex h-8 w-full items-center justify-start gap-[3px] overflow-x-auto rounded-lg bg-muted p-[3px] text-muted-foreground sm:w-fit">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-[calc(100%-1px)] shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-all",
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

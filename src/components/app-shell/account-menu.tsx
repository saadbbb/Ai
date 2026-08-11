"use client";

import { ChevronsUpDown, Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const;

function ThemeToggle() {
  const t = useTranslations("common");
  const { theme = "system", setTheme } = useTheme();

  return (
    <div className="px-2 py-1.5">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("theme.label")}</span>
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        {THEME_OPTIONS.map(({ value, icon: Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              aria-label={t(`theme.${value}`)}
              aria-pressed={active}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-1 items-center justify-center rounded-md py-1.5 text-muted-foreground transition-colors hover:text-foreground",
                active && "bg-card text-foreground shadow-xs"
              )}
            >
              <Icon className="size-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface AccountMenuItem {
  href: string;
  label: string;
  /** A rendered icon element (e.g. `<Building2 className="size-4" />`), not a component reference — this crosses the Server→Client boundary, and bare component references aren't serializable there. */
  icon: ReactNode;
}

export function AccountMenu({
  email,
  items,
  logoutSlot,
  side = "top",
}: {
  email: string;
  items: AccountMenuItem[];
  logoutSlot: ReactNode;
  side?: "top" | "bottom" | "right";
}) {
  const initial = email.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg p-2 text-start hover:bg-muted focus-visible:outline-none">
        <Avatar className="size-8 shrink-0 ring-1 ring-border">
          <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">{initial}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{email}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align="start" className="w-64">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href}>
              {item.icon}
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <ThemeToggle />
        <DropdownMenuSeparator />
        <div className="px-1 py-1">{logoutSlot}</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

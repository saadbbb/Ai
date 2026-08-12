"use client";

import { ChevronDown, Store } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Replaces the old sidebar-bottom AccountMenu (name/email + Workspace Profile/
 * Team/Billing/Audit Log/Support links) — those settings links now live behind
 * a single "Manage your business" entry in this topbar menu instead (see
 * /dashboard/workspace-profile's new tabbed hub).
 */
export function ProfileMenu({
  name,
  identifier,
  logoutSlot,
}: {
  name: string;
  identifier: string;
  logoutSlot: ReactNode;
}) {
  const t = useTranslations("dashboard");
  const initial = name.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex shrink-0 items-center gap-1.5 rounded-full p-1 hover:bg-muted focus-visible:outline-none">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary-active text-xs font-bold text-white">
            {initial}
          </AvatarFallback>
        </Avatar>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="truncate text-sm font-semibold text-foreground">{name}</span>
          {identifier && <span className="truncate text-xs text-muted-foreground">{identifier}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/workspace-profile">
            <Store className="size-4 shrink-0" />
            {t("manageBusinessLink")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-1 py-1">
          <ThemeToggle />
        </div>
        <DropdownMenuSeparator />
        <div className="px-1 py-1">{logoutSlot}</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

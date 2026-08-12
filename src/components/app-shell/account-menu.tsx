"use client";

import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Theme } from "@/lib/theme/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  theme,
  side = "top",
}: {
  email: string;
  items: AccountMenuItem[];
  logoutSlot: ReactNode;
  theme: Theme;
  side?: "top" | "bottom" | "right";
}) {
  const initial = email.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg p-2 text-start hover:bg-muted focus-visible:outline-none">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary-active text-xs font-bold text-white">
            {initial}
          </AvatarFallback>
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
        <div className="px-1 py-1">
          <ThemeToggle theme={theme} />
        </div>
        <DropdownMenuSeparator />
        <div className="px-1 py-1">{logoutSlot}</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

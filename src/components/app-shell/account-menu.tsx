"use client";

import { ChevronsUpDown, type LucideIcon } from "lucide-react";
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

export interface AccountMenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
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
        <Avatar className="size-8 shrink-0">
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
              <item.icon className="size-4" />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-1 py-1">{logoutSlot}</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

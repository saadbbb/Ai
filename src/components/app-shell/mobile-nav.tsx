"use client";

import { Menu } from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/logo";
import type { Workspace } from "@/db/schema";
import { isRtl } from "@/i18n/config";
import type { AccountMenuItem } from "./account-menu";
import { NavGroupList, type NavGroupItem } from "./nav-group-list";
import { AgentPicker, WorkspacePicker } from "./sidebar-switchers";

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentWorkspaceId: string;
  workspaceSwitcherLabel: string;
  agentName: string | null;
  agentSwitcherLabel: string;
}

export function MobileNav({
  groups,
  productName,
  navLabel,
  homeHref = "/dashboard",
  switchers,
  accountItems,
  logoutSlot,
}: {
  groups: NavGroupItem[];
  productName: string;
  navLabel: string;
  homeHref?: string;
  /** Dashboard shell only — the admin panel has no workspace/agent concept. */
  switchers?: WorkspaceSwitcherProps;
  /** Admin panel only — the dashboard shell now covers profile/logout via the topbar ProfileMenu instead. */
  accountItems?: AccountMenuItem[];
  logoutSlot?: ReactNode;
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const startSide = isRtl(locale) ? "right" : "left";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={navLabel}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side={startSide} className="flex w-72 flex-col p-0">
        <SheetHeader className="border-b px-4 py-5">
          <SheetTitle asChild>
            <Link href={homeHref} onClick={() => setOpen(false)} className="flex items-center gap-2.5">
              <Logo className="h-7" />
              <span className="text-base font-semibold">{productName}</span>
            </Link>
          </SheetTitle>
        </SheetHeader>

        {switchers && (
          <div className="space-y-2 border-b px-3 py-3">
            <WorkspacePicker
              workspaces={switchers.workspaces}
              currentWorkspaceId={switchers.currentWorkspaceId}
              label={switchers.workspaceSwitcherLabel}
            />
            <AgentPicker agentName={switchers.agentName} label={switchers.agentSwitcherLabel} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavGroupList groups={groups} onLinkClick={() => setOpen(false)} size="mobile" />
        </div>

        {accountItems && (
          <div className="space-y-0.5 border-t px-3 py-3">
            {accountItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-muted hover:text-foreground"
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
            {logoutSlot && <div className="px-3 pt-1">{logoutSlot}</div>}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

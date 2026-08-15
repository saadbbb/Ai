"use client";

import { Home, Inbox, MoreHorizontal, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { isLinkActive } from "./nav-link";
import { NavGroupList, type NavGroupItem } from "./nav-group-list";

export function MobileBottomNav({
  groups,
  productName,
  homeLabel,
  inboxLabel,
  contactsLabel,
  moreLabel,
}: {
  groups: NavGroupItem[];
  productName: string;
  homeLabel: string;
  inboxLabel: string;
  contactsLabel: string;
  moreLabel: string;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs = [
    { href: "/dashboard", label: homeLabel, icon: Home },
    { href: "/dashboard/inbox", label: inboxLabel, icon: Inbox },
    { href: "/dashboard/contacts", label: contactsLabel, icon: Users },
  ];
  const onCoreTab = tabs.some((tab) => isLinkActive(pathname, tab.href));

  return (
    <>
      <nav
        aria-label={moreLabel}
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {tabs.map((tab) => {
          const active = isLinkActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-1"
            >
              <tab.icon className={cn("size-5", active ? "text-primary" : "text-text-muted")} strokeWidth={2} />
              <span className={cn("text-[11px] font-medium", active ? "text-primary" : "text-text-muted")}>{tab.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1"
        >
          <MoreHorizontal className={cn("size-5", !onCoreTab ? "text-primary" : "text-text-muted")} strokeWidth={2} />
          <span className={cn("text-[11px] font-medium", !onCoreTab ? "text-primary" : "text-text-muted")}>{moreLabel}</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="flex max-h-[80dvh] flex-col p-0 md:hidden">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle>{productName}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <NavGroupList groups={groups} onLinkClick={() => setMoreOpen(false)} size="mobile" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

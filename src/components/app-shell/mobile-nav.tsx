"use client";

import { Menu } from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/logo";
import { isRtl } from "@/i18n/config";
import { cn } from "@/lib/utils";
import type { AccountMenuItem } from "./account-menu";
import { NAV_ICONS } from "./nav-icons";
import type { NavGroupItem } from "./sidebar-nav";

const EXACT_MATCH_HREFS = new Set(["/dashboard", "/admin"]);

function isLinkActive(pathname: string, href: string) {
  if (EXACT_MATCH_HREFS.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav({
  groups,
  productName,
  accountItems,
  navLabel,
  logoutSlot,
}: {
  groups: NavGroupItem[];
  productName: string;
  accountItems: AccountMenuItem[];
  navLabel: string;
  logoutSlot: ReactNode;
}) {
  const pathname = usePathname();
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
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle asChild>
            <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
              <Logo className="h-7" />
              <span className="text-base font-semibold">{productName}</span>
            </Link>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="flex flex-col gap-5">
            {groups.map((group) => (
              <div key={group.heading ?? group.links[0]?.href} className="space-y-0.5">
                {group.heading && (
                  <p className="px-3 pb-1 text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
                    {group.heading}
                  </p>
                )}
                {group.links.map((link) => {
                  const Icon = NAV_ICONS[link.href];
                  const active = isLinkActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary-soft text-primary"
                          : "text-text-secondary hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {Icon && <Icon className="size-4 shrink-0" strokeWidth={2} />}
                      <span className="truncate">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

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
          <div className="px-3 pt-1">{logoutSlot}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./nav-icons";

export interface NavLinkItem {
  href: string;
  label: string;
}

export interface NavGroupItem {
  heading?: string;
  links: NavLinkItem[];
}

const EXACT_MATCH_HREFS = new Set(["/dashboard", "/admin"]);

function isLinkActive(pathname: string, href: string) {
  if (EXACT_MATCH_HREFS.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ groups }: { groups: NavGroupItem[] }) {
  const pathname = usePathname();

  return (
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
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
  );
}

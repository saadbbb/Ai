"use client";

import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { isLinkActive, NavLink } from "./nav-link";

export interface NavLinkItem {
  href: string;
  label: string;
}

export interface NavGroupItem {
  heading?: string;
  links: NavLinkItem[];
}

export function SidebarNav({ groups }: { groups: NavGroupItem[] }) {
  const pathname = usePathname();
  const [openHeadings, setOpenHeadings] = useState<Set<string>>(
    () =>
      new Set(
        groups
          .filter((group) => group.heading && group.links.some((link) => isLinkActive(pathname, link.href)))
          .map((group) => group.heading as string)
      )
  );

  function toggle(heading: string) {
    setOpenHeadings((prev) => {
      const next = new Set(prev);
      if (next.has(heading)) {
        next.delete(heading);
      } else {
        next.add(heading);
      }
      return next;
    });
  }

  return (
    <nav className="flex flex-col gap-5">
      {groups.map((group) => {
        if (!group.heading) {
          return (
            <div key={group.links[0]?.href} className="space-y-0.5">
              {group.links.map((link) => (
                <NavLink key={link.href} href={link.href} label={link.label} />
              ))}
            </div>
          );
        }

        const open = openHeadings.has(group.heading);
        return (
          <div key={group.heading} className="space-y-0.5">
            <button
              type="button"
              onClick={() => toggle(group.heading as string)}
              aria-expanded={open}
              className="flex w-full items-center justify-between rounded-sm px-3 pb-1 text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              <span>{group.heading}</span>
              <ChevronDown
                className={cn("size-3.5 shrink-0 transition-transform duration-200", open ? "rotate-0" : "-rotate-90")}
                strokeWidth={2.5}
              />
            </button>
            <div className={cn("grid transition-all duration-200 ease-in-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <div className="overflow-hidden">
                <div className="space-y-0.5 pt-0.5">
                  {group.links.map((link) => (
                    <NavLink key={link.href} href={link.href} label={link.label} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

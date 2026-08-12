"use client";

import { usePathname } from "next/navigation";
import { isLinkActive } from "./nav-link";
import type { NavGroupItem } from "./sidebar-nav";

export function TopbarTitle({ groups }: { groups: NavGroupItem[] }) {
  const pathname = usePathname();
  const allLinks = groups.flatMap((group) => group.links);
  const match = allLinks.filter((link) => isLinkActive(pathname, link.href)).sort((a, b) => b.href.length - a.href.length)[0];

  if (!match) return null;
  return <span className="truncate text-sm font-bold text-text-secondary">{match.label}</span>;
}

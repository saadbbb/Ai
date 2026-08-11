"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./nav-icons";

const EXACT_MATCH_HREFS = new Set(["/dashboard", "/admin"]);

export function isLinkActive(pathname: string, href: string) {
  if (EXACT_MATCH_HREFS.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({
  href,
  label,
  onClick,
  size = "default",
}: {
  href: string;
  label: string;
  onClick?: () => void;
  size?: "default" | "mobile";
}) {
  const pathname = usePathname();
  const Icon = NAV_ICONS[href];
  const active = isLinkActive(pathname, href);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
        size === "mobile" ? "py-2.5" : "py-2",
        active ? "bg-primary-soft text-primary" : "text-text-secondary hover:bg-muted hover:text-foreground"
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" strokeWidth={2} />}
      <span className="truncate">{label}</span>
    </Link>
  );
}

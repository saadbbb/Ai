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
        "flex items-center gap-2.5 rounded-sm border-s-[3px] ps-2.5 pe-3 text-[13.5px] font-semibold transition-colors",
        size === "mobile" ? "py-2.5" : "py-2",
        active
          ? "border-primary bg-gradient-to-r from-primary-soft to-transparent text-foreground"
          : "border-transparent text-text-secondary hover:bg-muted hover:text-foreground"
      )}
    >
      {Icon && (
        <span
          className={cn(
            "flex size-[30px] shrink-0 items-center justify-center rounded-[9px]",
            active ? "bg-primary shadow-glow" : "bg-white/5"
          )}
        >
          <Icon className={cn("size-4", active ? "text-white" : "text-text-secondary")} strokeWidth={2} />
        </span>
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}

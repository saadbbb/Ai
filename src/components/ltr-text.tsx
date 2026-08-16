import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * For technical strings (URLs, domains, emails) that must render left-to-right and keep
 * their start visible even inside an RTL document. Plain `truncate` on RTL-inherited text
 * clips from the wrong side — with `dir="rtl"` on an ancestor, `text-overflow: ellipsis`
 * cuts from the *start* of the embedded LTR run instead of the end, so a long URL can lose
 * its protocol/domain entirely instead of showing "https://example.com/…". `dir="ltr"`
 * fixes the truncation side; the ellipsis then correctly preserves the readable prefix.
 */
const LTR_TEXT_CLASS = "block truncate text-start [direction:ltr]";

export function LtrText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span dir="ltr" className={cn(LTR_TEXT_CLASS, className)}>
      {children}
    </span>
  );
}

/**
 * For a line that joins several values (phone · email · city) where some are LTR technical
 * strings and others (a city/country name) are normal RTL text — each part needs its own
 * direction, not one direction for the whole line. `<bdi>` isolates each part's bidi run
 * based on its own content, without forcing the wrong direction on the RTL parts.
 */
export function JoinedBdi({ items, separator = " · " }: { items: (string | null | undefined)[]; separator?: string }) {
  const parts = items.filter((item): item is string => Boolean(item));
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          <bdi>{part}</bdi>
          {index < parts.length - 1 && separator}
        </span>
      ))}
    </>
  );
}

export function LtrLink({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a dir="ltr" className={cn(LTR_TEXT_CLASS, className)} {...props}>
      {children}
    </a>
  );
}

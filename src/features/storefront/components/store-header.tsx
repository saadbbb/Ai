import Image from "next/image";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { Storefront } from "@/db/schema";
import { cn } from "@/lib/utils";
import { CartBadge } from "./cart-badge";

interface StoreHeaderProps {
  storefront: Storefront;
  workspaceName: string;
  logoUrl: string | null;
  slug: string;
}

export function StoreHeader({ storefront, workspaceName, logoUrl, slug }: StoreHeaderProps) {
  const base = `/store/${slug}`;

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div
        className={cn(
          "mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-6 py-3.5",
          storefront.headerStyle === "centered" && "flex-col text-center",
        )}
      >
        <Link href={base} className="flex items-center gap-2.5">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={workspaceName}
              width={38}
              height={38}
              sizes="38px"
              className="size-[38px] shrink-0 rounded-full object-cover ring-1 ring-border-strong"
            />
          ) : (
            <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              {workspaceName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-base font-semibold tracking-tight">{workspaceName}</span>
        </Link>

        <div className={cn("flex flex-1 items-center gap-3", storefront.headerStyle === "centered" ? "justify-center" : "justify-end")}>
          <LocaleSwitcher />
          <CartBadge slug={slug} />
        </div>
      </div>
    </header>
  );
}

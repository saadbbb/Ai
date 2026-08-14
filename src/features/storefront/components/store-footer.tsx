import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Storefront } from "@/db/schema";
import { cn } from "@/lib/utils";
import { SocialLinksRow } from "./social-links-row";

interface StoreFooterProps {
  storefront: Storefront;
  workspaceName: string;
  slug: string;
  /** Published custom pages (Store Pages system) — appended after the two built-in links. */
  customPages: { href: string; label: string }[];
}

export async function StoreFooter({ storefront, workspaceName, slug, customPages }: StoreFooterProps) {
  if (!storefront.showFooter) return null;

  const t = await getTranslations("website.public.nav");
  const base = `/store/${slug}`;
  const links = [
    { href: base, label: t("home") },
    { href: `${base}/products`, label: t("products") },
    ...customPages,
  ];

  return (
    <footer className={cn("border-t bg-surface-elevated/40", storefront.footerStyle === "minimal" ? "py-6" : "py-12")}>
      <div className="mx-auto max-w-5xl space-y-5 px-6 text-center">
        {storefront.footerStyle !== "minimal" && (
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        )}
        <SocialLinksRow links={storefront.socialLinks} />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {workspaceName}
        </p>
      </div>
    </footer>
  );
}

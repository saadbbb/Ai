import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Storefront } from "@/db/schema";
import { cn } from "@/lib/utils";
import { CartProvider } from "../lib/cart-context";
import { CartBadge } from "./cart-badge";
import { PromoPopup } from "./promo-popup";
import { SocialLinksRow } from "./social-links-row";
import { StoreAssistantWidget } from "./store-assistant-widget";
import { TrackingScripts } from "./tracking-scripts";

interface StorefrontShellProps {
  storefront: Storefront;
  workspaceName: string;
  logoUrl: string | null;
  slug: string;
  children: React.ReactNode;
}

export async function StorefrontShell({ storefront, workspaceName, logoUrl, slug, children }: StorefrontShellProps) {
  const t = await getTranslations("website.public.nav");
  const tPromo = await getTranslations("website.public.promo");
  const base = `/store/${slug}`;
  const links = [
    { href: base, label: t("home") },
    { href: `${base}/products`, label: t("products") },
    { href: `${base}/about`, label: t("about") },
    { href: `${base}/faq`, label: t("faq") },
    { href: `${base}/contact`, label: t("contact") },
  ];
  const accentColor = storefront.primaryColor && /^#[0-9a-fA-F]{6}$/.test(storefront.primaryColor) ? storefront.primaryColor : "#2563eb";

  return (
    <CartProvider slug={slug}>
      <div className={cn(storefront.darkMode && "dark", "min-h-full bg-background")}>
        <TrackingScripts ids={storefront.trackingIds} />
        <PromoPopup storefront={storefront} slug={slug} dismissLabel={tPromo("dismiss")} />

        {storefront.announcementBarText && (
          <div className="px-4 py-2 text-center text-sm text-primary-foreground" style={{ backgroundColor: accentColor }}>
            {storefront.announcementBarLink ? (
              <a href={storefront.announcementBarLink} className="hover:underline">
                {storefront.announcementBarText}
              </a>
            ) : (
              storefront.announcementBarText
            )}
          </div>
        )}

        <header className="border-b" style={{ borderColor: accentColor }}>
          <div
            className={cn(
              "mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-6 py-4",
              storefront.headerStyle === "centered" && "flex-col text-center",
              storefront.headerStyle === "minimal" ? "justify-between" : "justify-between",
            )}
          >
            <Link href={base} className="flex items-center gap-3">
              {logoUrl && <img src={logoUrl} alt={workspaceName} className="h-10 w-10 rounded-full object-cover" />}
              <span className="text-lg font-semibold">{workspaceName}</span>
            </Link>
            <div className="flex items-center gap-4">
              {storefront.headerStyle !== "minimal" && (
                <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {links.map((link) => (
                    <Link key={link.href} href={link.href} className="hover:text-foreground">
                      {link.label}
                    </Link>
                  ))}
                </nav>
              )}
              <CartBadge slug={slug} />
            </div>
          </div>
        </header>

        {storefront.bannerImageUrl && (
          <img src={storefront.bannerImageUrl} alt="" className="h-48 w-full object-cover sm:h-64" />
        )}

        <main>{children}</main>

        <footer className={cn("border-t", storefront.footerStyle === "minimal" ? "py-6" : "py-10")}>
          <div className="mx-auto max-w-5xl space-y-3 px-6 text-center">
            {storefront.footerStyle !== "minimal" && (
              <nav className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                {links.map((link) => (
                  <Link key={link.href} href={link.href} className="hover:text-foreground">
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

        <StoreAssistantWidget slug={slug} />
      </div>
    </CartProvider>
  );
}

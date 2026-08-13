import { getTranslations } from "next-intl/server";
import Image from "next/image";
import type { Storefront } from "@/db/schema";
import { cn } from "@/lib/utils";
import { CartProvider } from "../lib/cart-context";
import { CartSummaryBar } from "./cart-summary-bar";
import { PageViewTracker } from "./page-view-tracker";
import { PromoPopup } from "./promo-popup";
import { StoreAssistantWidget } from "./store-assistant-widget";
import { StoreFooter } from "./store-footer";
import { StoreHeader } from "./store-header";
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
        <PageViewTracker slug={slug} />
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

        <StoreHeader storefront={storefront} workspaceName={workspaceName} logoUrl={logoUrl} slug={slug} links={links} />

        {storefront.bannerImageUrl && (
          <div className="relative h-48 w-full sm:h-64">
            <Image src={storefront.bannerImageUrl} alt="" fill sizes="100vw" priority className="object-cover" />
          </div>
        )}

        <main>{children}</main>

        <StoreFooter storefront={storefront} workspaceName={workspaceName} slug={slug} links={links} />

        <CartSummaryBar slug={slug} />
        <StoreAssistantWidget slug={slug} />
      </div>
    </CartProvider>
  );
}

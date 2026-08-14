import { getTranslations } from "next-intl/server";
import Image from "next/image";
import type { Storefront } from "@/db/schema";
import { cn } from "@/lib/utils";
import { resolveAccentTokens } from "../lib/accent-tokens";
import { CartProvider } from "../lib/cart-context";
import { storefrontPageRepository } from "../repository/storefront-page.repository";
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
  workspaceId: string;
  logoUrl: string | null;
  slug: string;
  children: React.ReactNode;
}

export async function StorefrontShell({ storefront, workspaceName, workspaceId, logoUrl, slug, children }: StorefrontShellProps) {
  const [tPromo, publishedPages] = await Promise.all([
    getTranslations("website.public.promo"),
    storefrontPageRepository.findPublishedByWorkspaceId(workspaceId),
  ]);
  const customPages = publishedPages.map((page) => ({ href: `/store/${slug}/pages/${page.slug}`, label: page.title }));

  return (
    <CartProvider slug={slug}>
      <div className={cn(storefront.darkMode && "dark", "min-h-full bg-background")} style={resolveAccentTokens(storefront.primaryColor)}>
        <PageViewTracker slug={slug} />
        <TrackingScripts ids={storefront.trackingIds} />
        <PromoPopup storefront={storefront} slug={slug} dismissLabel={tPromo("dismiss")} />

        {storefront.announcementBarText && (
          <div className="bg-primary px-4 py-2 text-center text-sm text-primary-foreground">
            {storefront.announcementBarLink ? (
              <a href={storefront.announcementBarLink} className="hover:underline">
                {storefront.announcementBarText}
              </a>
            ) : (
              storefront.announcementBarText
            )}
          </div>
        )}

        <StoreHeader storefront={storefront} workspaceName={workspaceName} logoUrl={logoUrl} slug={slug} />

        {storefront.bannerImageUrl && (
          <div className="relative h-48 w-full sm:h-64">
            <Image src={storefront.bannerImageUrl} alt="" fill sizes="100vw" priority className="object-cover" />
          </div>
        )}

        <main>{children}</main>

        <StoreFooter storefront={storefront} workspaceName={workspaceName} slug={slug} customPages={customPages} />

        <CartSummaryBar slug={slug} />
        <StoreAssistantWidget slug={slug} />
      </div>
    </CartProvider>
  );
}

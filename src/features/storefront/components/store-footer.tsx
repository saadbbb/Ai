import Link from "next/link";
import type { Storefront } from "@/db/schema";
import { cn } from "@/lib/utils";
import { NewsletterSignupForm } from "./newsletter-signup-form";
import { SocialLinksRow } from "./social-links-row";

interface StoreFooterProps {
  storefront: Storefront;
  workspaceName: string;
  slug: string;
  links: { href: string; label: string }[];
}

export function StoreFooter({ storefront, workspaceName, slug, links }: StoreFooterProps) {
  if (!storefront.showFooter) return null;

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
        {storefront.footerStyle !== "minimal" && (
          <div className="mx-auto max-w-sm">
            <NewsletterSignupForm slug={slug} />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {workspaceName}
        </p>
      </div>
    </footer>
  );
}

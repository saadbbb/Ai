import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";
import { buildStorefrontMetadata } from "@/features/storefront/lib/seo";
import { blogPostRepository } from "@/features/storefront/repository/blog-post.repository";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await storefrontRepository.findPublishedByWorkspaceSlug(slug);
  if (!row) return {};
  const t = await getTranslations("website.public");
  return buildStorefrontMetadata({
    slug,
    path: "/blog",
    workspaceName: row.workspaceName,
    storefront: row.storefront,
    title: `${t("blogHeading")} — ${row.workspaceName}`,
  });
}

export default async function StoreBlogPage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("website.public");
  const { storefront, workspaceId, workspaceName, logoUrl } = await getStorefrontData(slug);
  const posts = await blogPostRepository.findPublishedByWorkspaceId(workspaceId);

  return (
    <StorefrontShell storefront={storefront} workspaceName={workspaceName} logoUrl={logoUrl} slug={slug}>
      <section className="mx-auto max-w-4xl space-y-4 px-6 py-12">
        <h1 className="text-2xl font-semibold">{t("blogHeading")}</h1>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noPosts")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/store/${slug}/blog/${post.slug}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  {post.coverImageUrl && (
                    <Image
                      src={post.coverImageUrl}
                      alt={post.title}
                      width={400}
                      height={300}
                      unoptimized
                      className="h-40 w-full rounded-t-lg object-cover"
                    />
                  )}
                  <CardContent className="space-y-1">
                    <p className="font-medium">{post.title}</p>
                    {post.excerpt && <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </StorefrontShell>
  );
}

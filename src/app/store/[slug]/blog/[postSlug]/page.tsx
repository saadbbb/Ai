import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";
import { buildStorefrontMetadata } from "@/features/storefront/lib/seo";
import { blogPostRepository } from "@/features/storefront/repository/blog-post.repository";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";
import { getAppUrl } from "@/lib/env";

interface PageProps {
  params: Promise<{ slug: string; postSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, postSlug } = await params;
  const row = await storefrontRepository.findPublishedByWorkspaceSlug(slug);
  if (!row) return {};
  const post = await blogPostRepository.findPublishedBySlug(row.workspaceId, postSlug);
  if (!post) return {};
  return buildStorefrontMetadata({
    slug,
    path: `/blog/${post.slug}`,
    workspaceName: row.workspaceName,
    storefront: row.storefront,
    title: `${post.title} — ${row.workspaceName}`,
    description: post.excerpt ?? undefined,
    imageUrl: post.coverImageUrl,
  });
}

export default async function StoreBlogPostPage({ params }: PageProps) {
  const { slug, postSlug } = await params;
  const t = await getTranslations("website.public");
  const { storefront, workspaceId, workspaceName, logoUrl } = await getStorefrontData(slug);
  const post = await blogPostRepository.findPublishedBySlug(workspaceId, postSlug);
  if (!post) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    ...(post.coverImageUrl ? { image: [post.coverImageUrl] } : undefined),
    ...(post.excerpt ? { description: post.excerpt } : undefined),
    mainEntityOfPage: `${getAppUrl()}/store/${slug}/blog/${post.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <StorefrontShell storefront={storefront} workspaceName={workspaceName} logoUrl={logoUrl} slug={slug}>
        <article className="mx-auto max-w-3xl space-y-4 px-6 py-12">
          <Link href={`/store/${slug}/blog`} className="text-sm text-muted-foreground hover:text-foreground">
            {t("backToBlog")}
          </Link>
          {post.coverImageUrl && (
            <Image
              src={post.coverImageUrl}
              alt={post.title}
              width={1200}
              height={675}
              sizes="(max-width: 768px) 100vw, 768px"
              priority
              className="aspect-video w-full rounded-lg object-cover"
            />
          )}
          <h1 className="text-2xl font-semibold">{post.title}</h1>
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">{post.content}</div>
        </article>
      </StorefrontShell>
    </>
  );
}

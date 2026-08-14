import "server-only";
import type { StorefrontPage } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { storefrontPageRepository } from "../repository/storefront-page.repository";

interface StorefrontPageInput {
  title: string;
  slug?: string;
  content: string;
  isPublished: boolean;
}

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

async function assertSlugAvailable(workspaceId: string, slug: string, excludeId?: string): Promise<void> {
  const existing = await storefrontPageRepository.findBySlugAnyStatus(workspaceId, slug);
  if (existing && existing.id !== excludeId) {
    throw new AppError("VALIDATION_ERROR", "A page with that URL slug already exists.");
  }
}

async function listPages(workspaceId: string): Promise<StorefrontPage[]> {
  return storefrontPageRepository.findByWorkspaceId(workspaceId);
}

async function createPage(workspaceId: string, input: StorefrontPageInput): Promise<StorefrontPage> {
  const slug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
  if (!slug) throw new AppError("VALIDATION_ERROR", "Couldn't derive a URL slug from that title.");
  await assertSlugAvailable(workspaceId, slug);

  const existing = await storefrontPageRepository.findByWorkspaceId(workspaceId);
  const sortOrder = existing.length === 0 ? 0 : Math.max(...existing.map((page) => page.sortOrder)) + 1;

  return storefrontPageRepository.create({ workspaceId, ...input, slug, sortOrder });
}

async function updatePage(workspaceId: string, pageId: string, input: StorefrontPageInput): Promise<StorefrontPage> {
  const slug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
  if (!slug) throw new AppError("VALIDATION_ERROR", "Couldn't derive a URL slug from that title.");
  await assertSlugAvailable(workspaceId, slug, pageId);
  const updated = await storefrontPageRepository.update(pageId, workspaceId, { ...input, slug });
  if (!updated) throw new AppError("NOT_FOUND", "Page not found.");
  return updated;
}

async function deletePage(workspaceId: string, pageId: string): Promise<void> {
  const existing = await storefrontPageRepository.findById(pageId, workspaceId);
  if (!existing) throw new AppError("NOT_FOUND", "Page not found.");
  await storefrontPageRepository.delete(pageId, workspaceId);
}

async function reorderPage(workspaceId: string, pageId: string, direction: -1 | 1): Promise<StorefrontPage[]> {
  const pages = await storefrontPageRepository.findByWorkspaceId(workspaceId);
  const index = pages.findIndex((page) => page.id === pageId);
  if (index === -1) throw new AppError("NOT_FOUND", "Page not found.");

  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= pages.length) return pages;

  const current = pages[index];
  const target = pages[targetIndex];
  await Promise.all([
    storefrontPageRepository.update(current.id, workspaceId, { sortOrder: target.sortOrder }),
    storefrontPageRepository.update(target.id, workspaceId, { sortOrder: current.sortOrder }),
  ]);

  return storefrontPageRepository.findByWorkspaceId(workspaceId);
}

export const storefrontPageService = {
  listPages,
  createPage,
  updatePage,
  deletePage,
  reorderPage,
};

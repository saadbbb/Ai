import "server-only";
import type { Review } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { reviewRepository } from "../repository/review.repository";

interface ReviewInput {
  authorName: string;
  rating: number;
  text: string;
  isFeatured: boolean;
  isPublished: boolean;
}

async function listReviews(workspaceId: string): Promise<Review[]> {
  return reviewRepository.findByWorkspaceId(workspaceId);
}

async function createReview(workspaceId: string, input: ReviewInput): Promise<Review> {
  return reviewRepository.create({ workspaceId, ...input });
}

async function updateReview(workspaceId: string, reviewId: string, input: ReviewInput): Promise<Review> {
  const updated = await reviewRepository.update(reviewId, workspaceId, input);
  if (!updated) throw new AppError("NOT_FOUND", "Review not found.");
  return updated;
}

async function deleteReview(workspaceId: string, reviewId: string): Promise<void> {
  const existing = await reviewRepository.findById(reviewId, workspaceId);
  if (!existing) throw new AppError("NOT_FOUND", "Review not found.");
  await reviewRepository.delete(reviewId, workspaceId);
}

export const reviewService = {
  listReviews,
  createReview,
  updateReview,
  deleteReview,
};

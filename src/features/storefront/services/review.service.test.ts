import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Review } from "@/db/schema";

vi.mock("../repository/review.repository", () => ({
  reviewRepository: {
    findByWorkspaceId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const { reviewRepository } = await import("../repository/review.repository");
const { reviewService } = await import("./review.service");

const WORKSPACE_ID = "workspace-1";

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: "review-1",
    workspaceId: WORKSPACE_ID,
    authorName: "Jane",
    rating: 5,
    text: "Great service!",
    isFeatured: false,
    isPublished: true,
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reviewService.createReview", () => {
  it("creates a review scoped to the workspace", async () => {
    const created = makeReview();
    vi.mocked(reviewRepository.create).mockResolvedValue(created);

    const result = await reviewService.createReview(WORKSPACE_ID, {
      authorName: "Jane",
      rating: 5,
      text: "Great service!",
      isFeatured: false,
      isPublished: true,
    });

    expect(reviewRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, authorName: "Jane", rating: 5 }),
    );
    expect(result).toBe(created);
  });
});

describe("reviewService.updateReview", () => {
  it("throws NOT_FOUND when the review doesn't belong to this workspace", async () => {
    vi.mocked(reviewRepository.update).mockResolvedValue(null);

    await expect(
      reviewService.updateReview(WORKSPACE_ID, "ghost-review", {
        authorName: "Jane",
        rating: 4,
        text: "Updated",
        isFeatured: false,
        isPublished: true,
      }),
    ).rejects.toThrow("Review not found.");
  });

  it("updates an existing review", async () => {
    const updated = makeReview({ rating: 4, text: "Updated" });
    vi.mocked(reviewRepository.update).mockResolvedValue(updated);

    const result = await reviewService.updateReview(WORKSPACE_ID, "review-1", {
      authorName: "Jane",
      rating: 4,
      text: "Updated",
      isFeatured: false,
      isPublished: true,
    });

    expect(result).toBe(updated);
  });
});

describe("reviewService.deleteReview", () => {
  it("throws NOT_FOUND when the review doesn't belong to this workspace", async () => {
    vi.mocked(reviewRepository.findById).mockResolvedValue(null);

    await expect(reviewService.deleteReview(WORKSPACE_ID, "ghost-review")).rejects.toThrow("Review not found.");
    expect(reviewRepository.delete).not.toHaveBeenCalled();
  });

  it("deletes an existing review", async () => {
    vi.mocked(reviewRepository.findById).mockResolvedValue(makeReview());

    await reviewService.deleteReview(WORKSPACE_ID, "review-1");

    expect(reviewRepository.delete).toHaveBeenCalledWith("review-1", WORKSPACE_ID);
  });
});

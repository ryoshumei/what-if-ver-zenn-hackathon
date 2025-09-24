import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CommunityPost,
  CommunityPostSchema,
  type CommunityPostWithDetails,
  CommunityPostWithDetailsSchema,
  type CreateCommunityPost,
  CreateCommunityPostSchema,
  canPublishGeneration,
  type FeedQuery,
  FeedQuerySchema,
  type FeedResponse,
  FeedResponseSchema,
  formatPublishedDate,
  generatePromptSummary,
  type UpdateCommunityPost,
  UpdateCommunityPostSchema,
} from "@/lib/models/CommunityPost";

describe("CommunityPost Model", () => {
  const validPost: CommunityPost = {
    id: "post-123",
    generationId: "gen-456",
    authorId: "user-789",
    promptSummary: "A beautiful landscape",
    thumbnailUrl: "https://storage.googleapis.com/bucket/thumb.jpg",
    publishedAt: new Date("2024-01-01T00:00:00Z"),
    visibility: "public",
  };

  const validPostWithDetails: CommunityPostWithDetails = {
    ...validPost,
    authorDisplayName: "John Doe",
    authorPhotoURL: "https://example.com/avatar.jpg",
    generationType: "image",
    assetFormat: "jpg",
    likesCount: 5,
    commentsCount: 2,
  };

  describe("CommunityPostSchema", () => {
    it("should validate a valid community post", () => {
      const result = CommunityPostSchema.safeParse(validPost);
      expect(result.success).toBe(true);
    });

    it("should require all mandatory fields", () => {
      const invalidPost = { ...validPost };
      delete (invalidPost as Record<string, unknown>).generationId;

      const result = CommunityPostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });

    it("should validate thumbnailUrl as URL", () => {
      const invalidPost = { ...validPost, thumbnailUrl: "not-a-url" };
      const result = CommunityPostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });

    it("should validate visibility enum", () => {
      const invalidPost = { ...validPost, visibility: "private" };
      const result = CommunityPostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });

    it("should only allow public visibility", () => {
      const post = { ...validPost, visibility: "public" as const };
      const result = CommunityPostSchema.safeParse(post);
      expect(result.success).toBe(true);
    });
  });

  describe("CreateCommunityPostSchema", () => {
    it("should validate create post data", () => {
      const createData: CreateCommunityPost = {
        generationId: "gen-456",
        authorId: "user-789",
        promptSummary: "A beautiful landscape",
        thumbnailUrl: "https://storage.googleapis.com/bucket/thumb.jpg",
        visibility: "public",
      };

      const result = CreateCommunityPostSchema.safeParse(createData);
      expect(result.success).toBe(true);
    });

    it("should provide default visibility", () => {
      const createData = {
        generationId: "gen-456",
        authorId: "user-789",
        promptSummary: "A beautiful landscape",
        thumbnailUrl: "https://storage.googleapis.com/bucket/thumb.jpg",
      };

      const result = CreateCommunityPostSchema.safeParse(createData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.visibility).toBe("public");
      }
    });

    it("should not accept id or publishedAt", () => {
      const createData = {
        id: "post-123",
        generationId: "gen-456",
        authorId: "user-789",
        promptSummary: "A beautiful landscape",
        thumbnailUrl: "https://storage.googleapis.com/bucket/thumb.jpg",
        publishedAt: new Date(),
      };

      const result = CreateCommunityPostSchema.safeParse(createData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("id");
        expect(result.data).not.toHaveProperty("publishedAt");
      }
    });
  });

  describe("UpdateCommunityPostSchema", () => {
    it("should validate update post data", () => {
      const updateData: UpdateCommunityPost = {
        promptSummary: "Updated summary",
        thumbnailUrl: "https://storage.googleapis.com/bucket/new-thumb.jpg",
      };

      const result = UpdateCommunityPostSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it("should allow partial updates", () => {
      const updateData = {
        promptSummary: "Updated summary",
      };

      const result = UpdateCommunityPostSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it("should not accept protected fields", () => {
      const updateData = {
        id: "post-123",
        generationId: "gen-456",
        authorId: "user-789",
        publishedAt: new Date(),
        promptSummary: "Updated summary",
      };

      const result = UpdateCommunityPostSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("id");
        expect(result.data).not.toHaveProperty("generationId");
        expect(result.data).not.toHaveProperty("authorId");
        expect(result.data).not.toHaveProperty("publishedAt");
      }
    });
  });

  describe("CommunityPostWithDetailsSchema", () => {
    it("should validate post with details", () => {
      const result =
        CommunityPostWithDetailsSchema.safeParse(validPostWithDetails);
      expect(result.success).toBe(true);
    });

    it("should provide default counts", () => {
      const postData = {
        ...validPost,
        authorDisplayName: "John Doe",
        authorPhotoURL: "https://example.com/avatar.jpg",
        generationType: "image" as const,
        assetFormat: "jpg",
      };

      const result = CommunityPostWithDetailsSchema.safeParse(postData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.likesCount).toBe(0);
        expect(result.data.commentsCount).toBe(0);
      }
    });

    it("should allow null authorPhotoURL", () => {
      const postData = { ...validPostWithDetails, authorPhotoURL: null };
      const result = CommunityPostWithDetailsSchema.safeParse(postData);
      expect(result.success).toBe(true);
    });

    it("should validate generationType enum", () => {
      const postData = { ...validPostWithDetails, generationType: "invalid" };
      const result = CommunityPostWithDetailsSchema.safeParse(postData);
      expect(result.success).toBe(false);
    });
  });

  describe("FeedQuerySchema", () => {
    it("should validate basic feed query", () => {
      const query: FeedQuery = {
        page: 1,
        pageSize: 12,
      };

      const result = FeedQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it("should provide default values", () => {
      const query = {};

      const result = FeedQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(12);
      }
    });

    it("should validate page minimum", () => {
      const query = { page: 0 };
      const result = FeedQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it("should validate pageSize range", () => {
      const invalidQueries = [{ pageSize: 0 }, { pageSize: 51 }];

      invalidQueries.forEach((query) => {
        const result = FeedQuerySchema.safeParse(query);
        expect(result.success).toBe(false);
      });
    });

    it("should accept optional filters", () => {
      const query = {
        q: "landscape",
        authorId: "user-123",
        type: "image" as const,
      };

      const result = FeedQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });
  });

  describe("FeedResponseSchema", () => {
    it("should validate feed response", () => {
      const response: FeedResponse = {
        items: [validPostWithDetails],
        nextPage: 2,
        totalCount: 100,
      };

      const result = FeedResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should allow null nextPage", () => {
      const response = {
        items: [validPostWithDetails],
        nextPage: null,
      };

      const result = FeedResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should allow optional totalCount", () => {
      const response = {
        items: [validPostWithDetails],
        nextPage: null,
      };

      const result = FeedResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe("generatePromptSummary", () => {
    it("should return original prompt if under max length", () => {
      const prompt = "A short prompt";
      const result = generatePromptSummary(prompt, 100);
      expect(result).toBe(prompt);
    });

    it("should truncate long prompts", () => {
      const prompt =
        "A very long prompt that exceeds the maximum length and should be truncated with ellipsis";
      const result = generatePromptSummary(prompt, 50);
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).toMatch(/\.\.\.$/); // Use regex instead of toEndWith
    });

    it("should truncate at word boundary when possible", () => {
      const prompt = "A very long prompt that exceeds the maximum length";
      const result = generatePromptSummary(prompt, 30);
      expect(result).toBe("A very long prompt that...");
    });

    it("should use hard truncation for words longer than 70% of max length", () => {
      const prompt = "Supercalifragilisticexpialidocious prompt";
      const result = generatePromptSummary(prompt, 20);
      expect(result).toBe("Supercalifragilis...");
    });

    it("should use default max length of 100", () => {
      const prompt = "A".repeat(150);
      const result = generatePromptSummary(prompt);
      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).toMatch(/\.\.\.$/); // Use regex instead of toEndWith
    });
  });

  describe("canPublishGeneration", () => {
    it("should return true for complete generation", () => {
      expect(canPublishGeneration("complete")).toBe(true);
    });

    it("should return false for non-complete generation", () => {
      const statuses = ["queued", "running", "failed"];
      statuses.forEach((status) => {
        expect(canPublishGeneration(status)).toBe(false);
      });
    });
  });

  describe("formatPublishedDate", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return 'Just now' for recent posts", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);

      const publishedAt = new Date("2024-01-01T11:59:30Z"); // 30 seconds ago
      const result = formatPublishedDate(publishedAt);
      expect(result).toBe("Just now");
    });

    it("should return minutes for posts under an hour", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);

      const publishedAt = new Date("2024-01-01T11:30:00Z"); // 30 minutes ago
      const result = formatPublishedDate(publishedAt);
      expect(result).toBe("30m ago");
    });

    it("should return hours for posts under a day", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);

      const publishedAt = new Date("2024-01-01T08:00:00Z"); // 4 hours ago
      const result = formatPublishedDate(publishedAt);
      expect(result).toBe("4h ago");
    });

    it("should return days for posts under a week", () => {
      const now = new Date("2024-01-05T12:00:00Z");
      vi.setSystemTime(now);

      const publishedAt = new Date("2024-01-02T12:00:00Z"); // 3 days ago
      const result = formatPublishedDate(publishedAt);
      expect(result).toBe("3d ago");
    });

    it("should return formatted date for posts over a week", () => {
      const now = new Date("2024-01-15T12:00:00Z");
      vi.setSystemTime(now);

      const publishedAt = new Date("2024-01-01T12:00:00Z"); // 2 weeks ago
      const result = formatPublishedDate(publishedAt);
      expect(result).toBe(publishedAt.toLocaleDateString());
    });
  });
});

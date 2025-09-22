import { z } from "zod";

export const CommunityPostSchema = z.object({
  id: z.string(),
  generationId: z.string(),
  authorId: z.string(),
  promptSummary: z.string(),
  thumbnailUrl: z.string().url(),
  publishedAt: z.date(),
  visibility: z.enum(["public"]),
});

export type CommunityPost = z.infer<typeof CommunityPostSchema>;

export const CreateCommunityPostSchema = CommunityPostSchema.omit({
  id: true,
  publishedAt: true,
}).extend({
  visibility: z.enum(["public"]).default("public"),
});

export type CreateCommunityPost = z.infer<typeof CreateCommunityPostSchema>;

export const UpdateCommunityPostSchema = CommunityPostSchema.partial().omit({
  id: true,
  generationId: true,
  authorId: true,
  publishedAt: true,
});

export type UpdateCommunityPost = z.infer<typeof UpdateCommunityPostSchema>;

export const CommunityPostWithDetailsSchema = CommunityPostSchema.extend({
  authorDisplayName: z.string(),
  authorPhotoURL: z.string().nullable(),
  generationType: z.enum(["image", "video"]),
  assetFormat: z.string(),
  likesCount: z.number().default(0),
  commentsCount: z.number().default(0),
});

export type CommunityPostWithDetails = z.infer<
  typeof CommunityPostWithDetailsSchema
>;

export const FeedQuerySchema = z.object({
  q: z.string().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(12),
  authorId: z.string().optional(),
  type: z.enum(["image", "video"]).optional(),
});

export type FeedQuery = z.infer<typeof FeedQuerySchema>;

export const FeedResponseSchema = z.object({
  items: z.array(CommunityPostWithDetailsSchema),
  nextPage: z.number().nullable(),
  totalCount: z.number().optional(),
});

export type FeedResponse = z.infer<typeof FeedResponseSchema>;

export function generatePromptSummary(
  originalPrompt: string,
  maxLength: number = 100,
): string {
  if (originalPrompt.length <= maxLength) {
    return originalPrompt;
  }

  const truncated = originalPrompt.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.7) {
    return `${truncated.substring(0, lastSpace)}...`;
  }

  return `${truncated}...`;
}

export function canPublishGeneration(generationStatus: string): boolean {
  return generationStatus === "complete";
}

export function formatPublishedDate(publishedAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - publishedAt.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return "Just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return publishedAt.toLocaleDateString();
  }
}

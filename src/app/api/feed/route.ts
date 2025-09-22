import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRequestLogger } from "../../../lib/logging/logger";
import { FeedQuerySchema } from "../../../lib/models/CommunityPost";
import { serverFirestore } from "../../../lib/repositories/firestore";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const logger = createRequestLogger(request);

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const rawQuery = {
      q: searchParams.get("q") || undefined,
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") || "12", 10),
      authorId: searchParams.get("authorId") || undefined,
      type: searchParams.get("type") as "image" | "video" | undefined,
    };

    // Validate query parameters
    const feedQuery = FeedQuerySchema.parse(rawQuery);

    logger.info("Getting community feed", {
      query: feedQuery.q,
      page: feedQuery.page,
      pageSize: feedQuery.pageSize,
      authorId: feedQuery.authorId,
      type: feedQuery.type,
    });

    // Get the feed from Firestore
    const feedResponse = await serverFirestore.getFeed(feedQuery);

    // For each post, we'd normally enrich with author and generation details
    // For now, we'll create mock enriched data
    const enrichedItems = await Promise.all(
      feedResponse.items.map(async (post) => {
        try {
          // Get author details (in a real app, this would be cached or joined)
          const author = await serverFirestore.getUser(post.authorId);

          // Get generation details to determine type
          const generation = await serverFirestore.getGeneration(
            post.generationId,
          );

          return {
            id: post.id,
            generationId: post.generationId,
            authorId: post.authorId,
            promptSummary: post.promptSummary,
            thumbnailUrl: post.thumbnailUrl,
            publishedAt: post.publishedAt.toISOString(),
            visibility: post.visibility,
            // Enriched fields
            authorDisplayName: author?.displayName || "Anonymous",
            authorPhotoURL: author?.photoURL || null,
            generationType: generation?.type || "image",
            assetFormat: generation?.type === "video" ? "mp4" : "png",
            likesCount: 0, // TODO: implement likes system
            commentsCount: 0, // TODO: implement comments system
          };
        } catch (error) {
          logger.warn("Failed to enrich feed item", {
            postId: post.id,
            generationId: post.generationId,
            error: (error as Error).message,
          });

          // Return basic post data if enrichment fails
          return {
            id: post.id,
            generationId: post.generationId,
            authorId: post.authorId,
            promptSummary: post.promptSummary,
            thumbnailUrl: post.thumbnailUrl,
            publishedAt: post.publishedAt.toISOString(),
            visibility: post.visibility,
            authorDisplayName: "Anonymous",
            authorPhotoURL: null,
            generationType: "image" as const,
            assetFormat: "png",
            likesCount: 0,
            commentsCount: 0,
          };
        }
      }),
    );

    // Filter by type if specified (since our repository doesn't support this filter yet)
    const filteredItems = feedQuery.type
      ? enrichedItems.filter((item) => item.generationType === feedQuery.type)
      : enrichedItems;

    // Adjust pagination if we filtered items
    const finalResponse = {
      items: filteredItems,
      nextPage: feedResponse.nextPage,
      totalCount: filteredItems.length, // This would be different in a real implementation
    };

    logger.info("Feed retrieved successfully", {
      itemCount: finalResponse.items.length,
      hasNextPage: !!finalResponse.nextPage,
      page: feedQuery.page,
    });

    return NextResponse.json(finalResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Validation error in feed query", { errors: error.errors });
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "Query parameter validation failed",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    logger.error("Feed retrieval failed", error as Error, {
      url: request.url,
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to retrieve feed",
      },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";

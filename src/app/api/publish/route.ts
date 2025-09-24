import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "../../../lib/http/security";
import { createRequestLogger } from "../../../lib/logging/logger";
import { generatePromptSummary } from "../../../lib/models/CommunityPost";
import { serverFirestore } from "../../../lib/repositories/firestore";

// Request validation schema based on OpenAPI spec
const PublishRequestSchema = z.object({
  generationId: z.string().min(1),
  visibility: z.enum(["public", "unlisted"]),
  altText: z.string().nullable().optional(),
  captions: z.string().nullable().optional(),
});

async function POST(request: NextRequest): Promise<NextResponse> {
  const logger = createRequestLogger(request);

  try {
    // Parse and validate request body
    const body =
      await parseJsonBody<z.infer<typeof PublishRequestSchema>>(request);
    const { generationId, visibility, altText, captions } =
      PublishRequestSchema.parse(body);

    logger.info("Publishing generation", {
      generationId,
      visibility,
      hasAltText: !!altText,
      hasCaptions: !!captions,
    });

    // Step 1: Get the generation and verify it exists
    const generation = await serverFirestore.getGeneration(generationId);
    if (!generation) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Generation not found",
        },
        { status: 404 },
      );
    }

    // Step 2: Verify the generation is complete
    if (generation.status !== "complete") {
      return NextResponse.json(
        {
          error: "Invalid state",
          message: "Can only publish completed generations",
          currentStatus: generation.status,
        },
        { status: 400 },
      );
    }

    // Step 3: Get the original prompt for the summary
    if (!generation.promptId) {
      return NextResponse.json(
        {
          error: "Invalid state",
          message: "Generation missing prompt ID",
        },
        { status: 500 },
      );
    }
    const originalPrompt = await serverFirestore.getIdeaPrompt(
      generation.promptId,
    );
    if (!originalPrompt) {
      return NextResponse.json(
        {
          error: "Invalid state",
          message: "Original prompt not found",
        },
        { status: 500 },
      );
    }

    // Step 4: Check if already published
    try {
      const _existingPosts = await serverFirestore.getFeed({
        page: 1,
        pageSize: 1,
      });

      // For now, we'll skip the duplicate check since our repository doesn't support generationId filter
      // In a real implementation, you'd add this filter to the repository
    } catch (_error) {
      // Continue with publication
    }

    // Step 5: Generate thumbnail URL (mock for now)
    const thumbnailUrl = `https://storage.googleapis.com/generated-thumbnails/${generationId}_thumb.jpg`;

    // Step 6: Create the community post
    const communityPost = await serverFirestore.createCommunityPost({
      generationId,
      authorId: originalPrompt.authorId,
      promptSummary: generatePromptSummary(originalPrompt.text),
      thumbnailUrl,
      visibility: "public", // Both 'public' and 'unlisted' map to 'public' per schema
    });

    // Step 7: Update the generation's asset visibility (if we had MediaAsset records)
    // For now, we'll just log this step
    logger.info("Would update asset visibility", {
      generationId,
      visibility,
      altText,
      captions,
    });

    logger.info("Generation published successfully", {
      generationId,
      communityPostId: communityPost.id,
      visibility,
      authorId: originalPrompt.authorId,
    });

    // Return the community post with 201 status (created)
    return NextResponse.json(
      {
        id: communityPost.id,
        generationId: communityPost.generationId,
        authorId: communityPost.authorId,
        promptSummary: communityPost.promptSummary,
        thumbnailUrl: communityPost.thumbnailUrl,
        publishedAt: communityPost.publishedAt.toISOString(),
        visibility: communityPost.visibility,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Validation error in publish", { errors: error.errors });
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "Request body validation failed",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    logger.error("Publication failed", error as Error, {
      generationId: "unknown",
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to publish generation",
      },
      { status: 500 },
    );
  }
}

export { POST };

export const runtime = "nodejs";

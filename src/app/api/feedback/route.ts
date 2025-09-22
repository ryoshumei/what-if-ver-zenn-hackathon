import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "../../../lib/http/security";
import { createRequestLogger } from "../../../lib/logging/logger";
import { serverFirestore } from "../../../lib/repositories/firestore";

// Request validation schema based on OpenAPI spec
const FeedbackRequestSchema = z.object({
  generationId: z.string().min(1),
  matchesIntent: z.boolean(),
  note: z.string().nullable().optional(),
});

async function POST(request: NextRequest): Promise<NextResponse> {
  const logger = createRequestLogger(request);

  try {
    // Parse and validate request body
    const body =
      await parseJsonBody<z.infer<typeof FeedbackRequestSchema>>(request);
    const { generationId, matchesIntent, note } =
      FeedbackRequestSchema.parse(body);

    logger.info("Recording alignment feedback", {
      generationId,
      matchesIntent,
      hasNote: !!note,
    });

    // Step 1: Verify the generation exists
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

    // Step 2: Record the alignment feedback
    await serverFirestore.recordAlignmentFeedback(
      generationId,
      matchesIntent,
      note || undefined,
    );

    logger.info("Alignment feedback recorded successfully", {
      generationId,
      matchesIntent,
      hasNote: !!note,
      previousFeedback: generation.alignmentFeedback,
    });

    // Return 204 No Content as per OpenAPI spec
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Validation error in feedback", { errors: error.errors });
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

    logger.error("Feedback recording failed", error as Error, {
      generationId: "unknown",
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to record feedback",
      },
      { status: 500 },
    );
  }
}

export { POST };

export const runtime = "nodejs";

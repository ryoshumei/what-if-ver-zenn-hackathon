import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { planner } from "../../../../../lib/agent/planner";
import { parseJsonBody } from "../../../../../lib/http/security";
import { createRequestLogger } from "../../../../../lib/logging/logger";
import { serverFirestore } from "../../../../../lib/repositories/firestore";
import { policyEnforcer } from "../../../../../lib/safety/policy";

// Request validation schema based on OpenAPI spec
const RefineRequestSchema = z.object({
  guidance: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const logger = createRequestLogger(request);
  const { id } = await params;

  try {
    // Parse and validate request body
    const body =
      await parseJsonBody<z.infer<typeof RefineRequestSchema>>(request);
    const { guidance } = RefineRequestSchema.parse(body);

    logger.info("Refining generation", {
      originalGenerationId: id,
      guidanceLength: guidance.length,
    });

    // Step 1: Get the original generation
    const originalGeneration = await serverFirestore.getGeneration(id);
    if (!originalGeneration) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Original generation not found",
        },
        { status: 404 },
      );
    }

    // Step 2: Check if the original generation can be refined
    if (originalGeneration.status !== "complete") {
      return NextResponse.json(
        {
          error: "Invalid state",
          message: "Can only refine completed generations",
          currentStatus: originalGeneration.status,
        },
        { status: 400 },
      );
    }

    // Step 3: Get the original prompt
    if (!originalGeneration.promptId) {
      return NextResponse.json(
        {
          error: "Invalid state",
          message: "Generation missing prompt ID",
        },
        { status: 500 },
      );
    }
    const originalPrompt = await serverFirestore.getIdeaPrompt(
      originalGeneration.promptId,
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

    // Step 4: Plan the refinement
    const refinementResult = await planner.planRefinement(
      originalGeneration,
      guidance,
    );
    if (!refinementResult.success) {
      return NextResponse.json(
        {
          error: "Invalid guidance",
          message: "Refinement guidance validation failed",
          details: refinementResult.errors,
        },
        { status: 400 },
      );
    }

    // Step 5: Check content policy for the refined prompt
    const policyResult = await policyEnforcer.checkPrompt(
      refinementResult.refinedPrompt,
      "anonymous",
    );
    if (!policyResult.allowed) {
      logger.warn("Content policy violation in refinement", {
        originalId: id,
        guidance: guidance.substring(0, 100),
        violations: policyResult.violations.map((v) => v.reason),
      });

      return NextResponse.json(
        {
          error: "Content policy violation",
          message: "Refined content not allowed by safety policies",
          violations: policyResult.violations.map((v) => ({
            reason: v.reason,
            severity: v.severity,
            suggestion: v.suggestion,
          })),
          recommendations: policyResult.recommendations,
        },
        { status: 400 },
      );
    }

    // Step 6: Create new IdeaPrompt for the refined version
    const refinedPrompt = await serverFirestore.createIdeaPrompt({
      authorId: originalPrompt.authorId,
      text: refinementResult.refinedPrompt,
      language: originalPrompt.language,
      tags: [...originalPrompt.tags, "refined"],
    });

    // Step 7: Create new Generation record for the refinement
    const refinedGeneration = await serverFirestore.createGeneration({
      status: "queued",
      promptId: refinedPrompt.id,
      type: originalGeneration.type,
      model: originalGeneration.model,
      refinementOf: originalGeneration.id,
      alignmentFeedback: null,
    });

    // Step 8: Store policy flags if any
    for (const flag of policyResult.flags) {
      await serverFirestore.createPolicyFlag({
        ...flag,
        targetId: refinedGeneration.id,
        targetType: "generation",
      });
    }

    logger.info("Generation refined successfully", {
      originalGenerationId: id,
      refinedGenerationId: refinedGeneration.id,
      improvements: refinementResult.improvements,
      type: originalGeneration.type,
    });

    // Return the new generation with 202 status (accepted for processing)
    return NextResponse.json(
      {
        id: refinedGeneration.id,
        promptId: refinedGeneration.promptId,
        type: refinedGeneration.type,
        status: refinedGeneration.status,
        model: refinedGeneration.model,
        refinementOf: refinedGeneration.refinementOf,
        createdAt: refinedGeneration.createdAt.toISOString(),
        updatedAt: refinedGeneration.updatedAt.toISOString(),
        improvements: refinementResult.improvements,
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Validation error in refinement", { errors: error.errors });
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

    logger.error("Generation refinement failed", error as Error, {
      originalGenerationId: id,
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to refine generation",
      },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";

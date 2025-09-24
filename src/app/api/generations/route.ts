import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { planner } from "../../../lib/agent/planner";
import { parseJsonBody } from "../../../lib/http/security";
import { createRequestLogger } from "../../../lib/logging/logger";
import { serverFirestore } from "../../../lib/repositories/firestore";
import { policyEnforcer } from "../../../lib/safety/policy";
// Import job runner to ensure it auto-starts (with singleton protection)
import "../../../lib/jobs/runner";

// Request validation schema based on OpenAPI spec
const CreateGenerationRequestSchema = z.object({
  type: z.enum(["image", "video"]),
  prompt: z.string().min(1).max(2000),
  guidance: z.string().nullable().optional(),
  language: z.enum(["en", "zh-CN", "ja", "unknown"]).default("unknown"),
  refinementOf: z.string().nullable().optional(),
});

async function POST(request: NextRequest): Promise<NextResponse> {
  const logger = createRequestLogger(request);

  try {
    // Parse and validate request body
    const body =
      await parseJsonBody<z.infer<typeof CreateGenerationRequestSchema>>(
        request,
      );
    const validatedData = CreateGenerationRequestSchema.parse(body);

    const { type, prompt, guidance, language, refinementOf } = validatedData;

    logger.info("Creating generation", {
      type,
      promptLength: prompt.length,
      language,
      hasGuidance: !!guidance,
      isRefinement: !!refinementOf,
    });

    // Step 1: Plan the generation
    const planResult = await planner.planGeneration(prompt, type);
    if (!planResult.success) {
      return NextResponse.json(
        {
          error: "Invalid prompt",
          message: "Prompt validation failed",
          details: planResult.errors,
          suggestions: planResult.suggestions,
        },
        { status: 400 },
      );
    }

    // Step 2: Check content policy
    const policyResult = await policyEnforcer.checkPrompt(prompt, "anonymous"); // TODO: get real user ID
    if (!policyResult.allowed) {
      logger.warn("Content policy violation", {
        prompt: prompt.substring(0, 100),
        violations: policyResult.violations.map((v) => v.reason),
      });

      return NextResponse.json(
        {
          error: "Content policy violation",
          message: "Content not allowed by safety policies",
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

    // Step 3: Create IdeaPrompt record
    const ideaPrompt = await serverFirestore.createIdeaPrompt({
      authorId: "anonymous", // TODO: get real user ID from auth
      text: prompt,
      language: planResult.detectedLanguage,
      tags: [], // TODO: extract tags from prompt
    });

    // Step 4: Create Generation record
    const generation = await serverFirestore.createGeneration({
      status: "queued",
      promptId: ideaPrompt.id,
      type,
      model:
        type === "image" ? "imagegeneration@006" : "veo-3.0-fast-generate-001",
      refinementOf: refinementOf || null,
      alignmentFeedback: null,
    });

    // Step 5: Store policy flags if any
    for (const flag of policyResult.flags) {
      await serverFirestore.createPolicyFlag({
        ...flag,
        targetId: generation.id,
        targetType: "generation",
      });
    }

    logger.info("Generation created successfully", {
      generationId: generation.id,
      ideaPromptId: ideaPrompt.id,
      type,
      model: generation.model,
    });

    // Return the generation with 202 status (accepted for processing)
    return NextResponse.json(
      {
        id: generation.id,
        promptId: generation.promptId,
        type: generation.type,
        status: generation.status,
        model: generation.model,
        refinementOf: generation.refinementOf,
        createdAt: generation.createdAt.toISOString(),
        updatedAt: generation.updatedAt.toISOString(),
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Validation error", { errors: error.errors });
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

    logger.error("Generation creation failed", error as Error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to create generation",
      },
      { status: 500 },
    );
  }
}

export { POST };

// Apply security middleware
export const runtime = "nodejs"; // Use Node.js runtime for database operations

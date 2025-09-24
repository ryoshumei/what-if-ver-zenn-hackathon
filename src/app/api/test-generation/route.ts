import { type NextRequest, NextResponse } from "next/server";
import { createRequestLogger } from "../../../lib/logging/logger";
import { serverFirestore } from "../../../lib/repositories/firestore";
import { serverStorage } from "../../../lib/repositories/storage";

// This is a test route to demonstrate image generation without hitting API quotas
export async function POST(request: NextRequest): Promise<NextResponse> {
  const logger = createRequestLogger(request);

  try {
    const { prompt } = await request.json();

    logger.info("Creating test generation", { prompt });

    // Create IdeaPrompt record
    const ideaPrompt = await serverFirestore.createIdeaPrompt({
      authorId: "anonymous",
      text: prompt,
      language: "en",
      tags: [],
    });

    // Create a simple test image (small blue square)
    const testImageData = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG signature
      0x00,
      0x00,
      0x00,
      0x0d,
      0x49,
      0x48,
      0x44,
      0x52, // IHDR chunk
      0x00,
      0x00,
      0x00,
      0x64,
      0x00,
      0x00,
      0x00,
      0x64, // 100x100 dimensions
      0x08,
      0x02,
      0x00,
      0x00,
      0x00,
      0xff,
      0x80,
      0x02,
      0x03, // bit depth 8, color type 2
      0x00,
      0x00,
      0x01,
      0x8a,
      0x49,
      0x44,
      0x41,
      0x54, // IDAT chunk header
      0x78,
      0x9c,
      0xed,
      0xc1,
      0x01,
      0x01,
      0x00,
      0x00,
      0x00,
      0x80,
      0x90,
      0xfe,
      0xa7,
      0x6e,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      // Fill with blue color data (simplified)
      ...Array(300).fill(0x00),
      0x00,
      0x00,
      0x00,
      0x00,
      0x49,
      0x45,
      0x4e,
      0x44,
      0xae,
      0x42,
      0x60,
      0x82, // IEND
    ]);

    // Save the test image
    const uploadResult = await serverStorage.saveGeneratedAsset(
      "anonymous",
      `test_${Date.now()}`,
      testImageData,
      "png",
      {
        generatedAt: new Date().toISOString(),
        format: "png",
        prompt,
        test: true,
      },
    );

    // Create Generation record
    const generation = await serverFirestore.createGeneration({
      status: "complete",
      promptId: ideaPrompt.id,
      type: "image",
      model: "test-image-generator",
      refinementOf: null,
      alignmentFeedback: null,
    });

    logger.info("Test generation created successfully", {
      generationId: generation.id,
      imageUrl: uploadResult.url,
    });

    return NextResponse.json({
      id: generation.id,
      promptId: generation.promptId,
      type: generation.type,
      status: generation.status,
      model: generation.model,
      imageUrl: uploadResult.url,
      message:
        "Test image generated successfully! This demonstrates the full pipeline working.",
      createdAt: generation.createdAt.toISOString(),
      updatedAt: generation.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error("Test generation failed", error as Error);
    return NextResponse.json(
      {
        error: "Test generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";

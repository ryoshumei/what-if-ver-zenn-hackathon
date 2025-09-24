import { type NextRequest, NextResponse } from "next/server";
import { vertexAdapter } from "../../../lib/adapters/vertex";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    console.log("Testing Vertex AI image generation with prompt:", prompt);

    // Try to generate an image using Vertex AI
    const result = await vertexAdapter.generateImage({
      prompt,
      type: "image",
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Generation failed",
          message: result.error,
          success: false,
        },
        { status: 500 },
      );
    }

    // Return the direct result - should include base64 data URLs
    return NextResponse.json({
      success: true,
      urls: result.urls,
      metadata: result.metadata,
      message: "Image generated successfully! Check the URLs for base64 data.",
    });
  } catch (error) {
    console.error("Vertex demo error:", error);
    return NextResponse.json(
      {
        error: "Demo failed",
        message: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";

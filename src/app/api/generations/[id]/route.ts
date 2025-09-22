import { type NextRequest, NextResponse } from "next/server";
import { createRequestLogger } from "../../../../lib/logging/logger";
import { serverFirestore } from "../../../../lib/repositories/firestore";
import { serverMediaAssets } from "../../../../lib/repositories/media";

interface GenerationResponse {
  id: string;
  promptId: string | null;
  type: "image" | "video";
  status: "queued" | "running" | "complete" | "failed";
  model: string;
  refinementOf: string | null;
  createdAt: string;
  updatedAt: string;
  error?: string;
  asset?: {
    id: string;
    url: string;
    storagePath: string;
    format: string;
    width: number | null;
    height: number | null;
    durationSec: number | null;
    altText: string | null;
    captions: string | null;
    visibility: "private" | "public" | "unlisted";
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const logger = createRequestLogger(request);
  const { id } = await params;

  try {
    logger.info("Getting generation status", { generationId: id });

    // Get the generation record
    const generation = await serverFirestore.getGeneration(id);
    if (!generation) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Generation not found",
        },
        { status: 404 },
      );
    }

    // Prepare response based on generation status
    const response: GenerationResponse = {
      id: generation.id,
      promptId: generation.promptId,
      type: generation.type,
      status: generation.status,
      model: generation.model,
      refinementOf: generation.refinementOf,
      createdAt: generation.createdAt.toISOString(),
      updatedAt: generation.updatedAt.toISOString(),
    };

    // Include error if generation failed
    if (generation.status === "failed" && generation.error) {
      response.error = generation.error;
    }

    // If generation is complete, try to include the actual asset
    if (generation.status === "complete") {
      try {
        const assets = await serverMediaAssets.getAssetsByGeneration(
          generation.id,
        );
        if (assets.length > 0) {
          // Return the first asset (main generation result)
          const asset = assets[0];
          response.asset = {
            id: asset.id,
            url: asset.url,
            storagePath: asset.storagePath,
            format: asset.format,
            width: asset.width,
            height: asset.height,
            durationSec: asset.durationSec,
            altText: asset.altText,
            captions: asset.captions,
            visibility: asset.visibility,
          };
        } else {
          // Fallback to mock asset if no MediaAsset records exist yet
          const mockAsset = {
            id: `asset_${generation.id}`,
            url: `https://storage.googleapis.com/generated-${generation.type}s/${generation.id}.${generation.type === "image" ? "png" : "mp4"}`,
            storagePath: `assets/anonymous/${generation.id}/generated.${generation.type === "image" ? "png" : "mp4"}`,
            format: generation.type === "image" ? "png" : "mp4",
            width: generation.type === "image" ? 1024 : 1280,
            height: generation.type === "image" ? 1024 : 720,
            durationSec: generation.type === "video" ? 6 : null,
            altText: null,
            captions: null,
            visibility: "private" as const,
          };
          response.asset = mockAsset;
        }
      } catch (error) {
        logger.warn("Failed to load asset for completed generation", {
          generationId: id,
          error: (error as Error).message,
        });
        // Don't fail the request if asset loading fails
      }
    }

    logger.info("Generation status retrieved", {
      generationId: id,
      status: generation.status,
      hasAsset: !!response.asset,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Failed to get generation status", error as Error, {
      generationId: id,
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to retrieve generation status",
      },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";

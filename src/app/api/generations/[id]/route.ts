import type { Timestamp } from "firebase/firestore";
import { type NextRequest, NextResponse } from "next/server";
import { createRequestLogger } from "../../../../lib/logging/logger";
import { serverFirestore } from "../../../../lib/repositories/firestore";
import { serverMediaAssets } from "../../../../lib/repositories/media";
import { getAdminStorage } from "../../../../lib/firebase/server";

// Helper function to convert Firestore timestamps to ISO strings
function toISOString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as Timestamp).toDate().toISOString();
  }
  return new Date(value as string | number | Date).toISOString();
}

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
      createdAt: toISOString(generation.createdAt),
      updatedAt: toISOString(generation.updatedAt),
    };

    // Include error if generation failed
    if (generation.status === "failed" && generation.error) {
      response.error = generation.error;
    }

    // If generation is complete, include the asset URLs from the generation record
    if (generation.status === "complete") {
      // Check if we have assetUrls stored directly in the generation record
      const assetUrls = (generation as any).assetUrls;
      const metadata = (generation as any).metadata;

      if (assetUrls && assetUrls.length > 0) {
        // Use the actual generated asset URL
        let url = assetUrls[0];
        // If it's a GCS URI, generate a signed URL for client playback
        if (url.startsWith("gs://")) {
          try {
            const withoutScheme = url.replace("gs://", "");
            const bucketName = withoutScheme.split("/")[0];
            const objectPath = withoutScheme.substring(bucketName.length + 1);
            const bucket = getAdminStorage().bucket(bucketName);
            const file = bucket.file(objectPath);
            const [signedUrl] = await file.getSignedUrl({
              action: "read",
              expires: Date.now() + 60 * 60 * 1000, // 60 minutes
            });
            url = signedUrl;
          } catch (e) {
            // Fallback to original URL if signing fails
          }
        }

        response.asset = {
          id: `asset_${generation.id}`,
          url,
          storagePath: assetUrls[0],
          format:
            metadata?.format || (generation.type === "image" ? "png" : "mp4"),
          width: metadata?.width || (generation.type === "image" ? 1024 : 1280),
          height:
            metadata?.height || (generation.type === "image" ? 1024 : 720),
          durationSec:
            metadata?.durationSec || (generation.type === "video" ? 6 : null),
          altText: null,
          captions: null,
          visibility: "private" as const,
        };
      } else {
        // Fallback: try to load from media assets
        try {
          const assets = await serverMediaAssets.getAssetsByGeneration(
            generation.id,
          );
          if (assets.length > 0) {
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
            // Final fallback to mock asset
            const mockAsset = {
              id: `asset_${generation.id}`,
              url: `/generated/${generation.id}.${generation.type === "image" ? "png" : "mp4"}`,
              storagePath: `generated/${generation.id}.${generation.type === "image" ? "png" : "mp4"}`,
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
        }
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

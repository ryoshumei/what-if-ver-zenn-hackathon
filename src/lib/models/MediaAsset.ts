import { z } from "zod";

export const MediaAssetSchema = z.object({
  id: z.string(),
  generationId: z.string(),
  url: z.string().url(),
  storagePath: z.string(),
  format: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  durationSec: z.number().nullable(),
  altText: z.string().nullable(),
  captions: z.string().nullable(),
  visibility: z.enum(["private", "unlisted", "public"]),
  createdAt: z.date(),
});

export type MediaAsset = z.infer<typeof MediaAssetSchema>;

export const CreateMediaAssetSchema = MediaAssetSchema.omit({
  id: true,
  createdAt: true,
}).extend({
  visibility: z.enum(["private", "unlisted", "public"]).default("private"),
});

export type CreateMediaAsset = z.infer<typeof CreateMediaAssetSchema>;

export const UpdateMediaAssetSchema = MediaAssetSchema.partial().omit({
  id: true,
  generationId: true,
  storagePath: true,
  createdAt: true,
});

export type UpdateMediaAsset = z.infer<typeof UpdateMediaAssetSchema>;

export function isImageAsset(asset: MediaAsset): boolean {
  const imageFormats = ["png", "jpg", "jpeg", "webp", "gif"];
  return imageFormats.includes(asset.format.toLowerCase());
}

export function isVideoAsset(asset: MediaAsset): boolean {
  const videoFormats = ["mp4", "webm", "mov", "avi"];
  return videoFormats.includes(asset.format.toLowerCase());
}

export function getAssetDisplayName(asset: MediaAsset): string {
  const type = isVideoAsset(asset) ? "Video" : "Image";
  const duration = asset.durationSec ? ` (${asset.durationSec}s)` : "";
  const dimensions =
    asset.width && asset.height ? ` ${asset.width}×${asset.height}` : "";
  return `${type}${dimensions}${duration}`;
}

export function validateAssetAccessibility(asset: MediaAsset): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (isImageAsset(asset) && !asset.altText?.trim()) {
    errors.push("Alt text is required for images");
  }

  if (isVideoAsset(asset) && !asset.captions?.trim()) {
    errors.push("Captions are recommended for videos");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function generateThumbnailPath(storagePath: string): string {
  const pathParts = storagePath.split("/");
  const filename = pathParts.pop();
  const nameWithoutExt = filename?.split(".")[0] || "thumbnail";
  return [...pathParts, `${nameWithoutExt}_thumb.jpg`].join("/");
}

import { describe, expect, it } from "vitest";
import {
  type CreateMediaAsset,
  CreateMediaAssetSchema,
  generateThumbnailPath,
  getAssetDisplayName,
  isImageAsset,
  isVideoAsset,
  type MediaAsset,
  MediaAssetSchema,
  type UpdateMediaAsset,
  UpdateMediaAssetSchema,
  validateAssetAccessibility,
} from "@/lib/models/MediaAsset";

describe("MediaAsset Model", () => {
  const validImageAsset: MediaAsset = {
    id: "asset-123",
    generationId: "gen-456",
    url: "https://storage.googleapis.com/bucket/image.jpg",
    storagePath: "assets/user123/gen456/image.jpg",
    format: "jpg",
    width: 1024,
    height: 768,
    durationSec: null,
    altText: "A beautiful landscape",
    captions: null,
    visibility: "private",
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };

  const validVideoAsset: MediaAsset = {
    id: "asset-124",
    generationId: "gen-457",
    url: "https://storage.googleapis.com/bucket/video.mp4",
    storagePath: "assets/user123/gen457/video.mp4",
    format: "mp4",
    width: 1920,
    height: 1080,
    durationSec: 30,
    altText: null,
    captions: "Video showing a flying car",
    visibility: "public",
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };

  describe("MediaAssetSchema", () => {
    it("should validate a valid image asset", () => {
      const result = MediaAssetSchema.safeParse(validImageAsset);
      expect(result.success).toBe(true);
    });

    it("should validate a valid video asset", () => {
      const result = MediaAssetSchema.safeParse(validVideoAsset);
      expect(result.success).toBe(true);
    });

    it("should require valid URL format", () => {
      const invalidAsset = { ...validImageAsset, url: "not-a-url" };
      const result = MediaAssetSchema.safeParse(invalidAsset);
      expect(result.success).toBe(false);
    });

    it("should validate visibility enum", () => {
      const invalidAsset = { ...validImageAsset, visibility: "invalid" };
      const result = MediaAssetSchema.safeParse(invalidAsset);
      expect(result.success).toBe(false);
    });

    it("should allow nullable fields to be null", () => {
      const asset = {
        ...validImageAsset,
        width: null,
        height: null,
        durationSec: null,
        altText: null,
        captions: null,
      };

      const result = MediaAssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });
  });

  describe("CreateMediaAssetSchema", () => {
    it("should validate create asset data", () => {
      const createData: CreateMediaAsset = {
        generationId: "gen-456",
        url: "https://storage.googleapis.com/bucket/image.jpg",
        storagePath: "assets/user123/gen456/image.jpg",
        format: "jpg",
        width: 1024,
        height: 768,
        durationSec: null,
        altText: "A beautiful landscape",
        captions: null,
        visibility: "private",
      };

      const result = CreateMediaAssetSchema.safeParse(createData);
      expect(result.success).toBe(true);
    });

    it("should provide default visibility", () => {
      const createData = {
        generationId: "gen-456",
        url: "https://storage.googleapis.com/bucket/image.jpg",
        storagePath: "assets/user123/gen456/image.jpg",
        format: "jpg",
        width: 1024,
        height: 768,
        durationSec: null,
        altText: "A beautiful landscape",
        captions: null,
      };

      const result = CreateMediaAssetSchema.safeParse(createData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.visibility).toBe("private");
      }
    });
  });

  describe("UpdateMediaAssetSchema", () => {
    it("should validate update asset data", () => {
      const updateData: UpdateMediaAsset = {
        altText: "Updated alt text",
        visibility: "public",
      };

      const result = UpdateMediaAssetSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it("should allow partial updates", () => {
      const updateData = {
        visibility: "unlisted" as const,
      };

      const result = UpdateMediaAssetSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });
  });

  describe("isImageAsset", () => {
    it("should return true for image formats", () => {
      const formats = ["png", "jpg", "jpeg", "webp", "gif"];

      formats.forEach((format) => {
        const asset = { ...validImageAsset, format };
        expect(isImageAsset(asset)).toBe(true);
      });
    });

    it("should be case insensitive", () => {
      const asset = { ...validImageAsset, format: "PNG" };
      expect(isImageAsset(asset)).toBe(true);
    });

    it("should return false for video formats", () => {
      const asset = { ...validImageAsset, format: "mp4" };
      expect(isImageAsset(asset)).toBe(false);
    });
  });

  describe("isVideoAsset", () => {
    it("should return true for video formats", () => {
      const formats = ["mp4", "webm", "mov", "avi"];

      formats.forEach((format) => {
        const asset = { ...validVideoAsset, format };
        expect(isVideoAsset(asset)).toBe(true);
      });
    });

    it("should be case insensitive", () => {
      const asset = { ...validVideoAsset, format: "MP4" };
      expect(isVideoAsset(asset)).toBe(true);
    });

    it("should return false for image formats", () => {
      const asset = { ...validVideoAsset, format: "jpg" };
      expect(isVideoAsset(asset)).toBe(false);
    });
  });

  describe("getAssetDisplayName", () => {
    it("should return image display name with dimensions", () => {
      const asset = { ...validImageAsset };
      const result = getAssetDisplayName(asset);
      expect(result).toBe("Image 1024×768");
    });

    it("should return video display name with dimensions and duration", () => {
      const asset = { ...validVideoAsset };
      const result = getAssetDisplayName(asset);
      expect(result).toBe("Video 1920×1080 (30s)");
    });

    it("should handle missing dimensions", () => {
      const asset = { ...validImageAsset, width: null, height: null };
      const result = getAssetDisplayName(asset);
      expect(result).toBe("Image");
    });

    it("should handle missing duration for video", () => {
      const asset = { ...validVideoAsset, durationSec: null };
      const result = getAssetDisplayName(asset);
      expect(result).toBe("Video 1920×1080");
    });
  });

  describe("validateAssetAccessibility", () => {
    it("should pass validation for image with alt text", () => {
      const asset = { ...validImageAsset, altText: "Descriptive alt text" };
      const result = validateAssetAccessibility(asset);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should fail validation for image without alt text", () => {
      const asset = { ...validImageAsset, altText: null };
      const result = validateAssetAccessibility(asset);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Alt text is required for images");
    });

    it("should fail validation for image with empty alt text", () => {
      const asset = { ...validImageAsset, altText: "   " };
      const result = validateAssetAccessibility(asset);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Alt text is required for images");
    });

    it("should recommend captions for video without captions", () => {
      const asset = { ...validVideoAsset, captions: null };
      const result = validateAssetAccessibility(asset);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Captions are recommended for videos");
    });

    it("should pass validation for video with captions", () => {
      const asset = { ...validVideoAsset, captions: "Video transcript" };
      const result = validateAssetAccessibility(asset);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should fail validation for video with empty captions", () => {
      const asset = { ...validVideoAsset, captions: "   " };
      const result = validateAssetAccessibility(asset);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Captions are recommended for videos");
    });
  });

  describe("generateThumbnailPath", () => {
    it("should generate thumbnail path for image", () => {
      const storagePath = "assets/user123/gen456/image.jpg";
      const result = generateThumbnailPath(storagePath);
      expect(result).toBe("assets/user123/gen456/image_thumb.jpg");
    });

    it("should generate thumbnail path for video", () => {
      const storagePath = "assets/user123/gen456/video.mp4";
      const result = generateThumbnailPath(storagePath);
      expect(result).toBe("assets/user123/gen456/video_thumb.jpg");
    });

    it("should handle nested paths", () => {
      const storagePath = "assets/user123/gen456/subfolder/file.png";
      const result = generateThumbnailPath(storagePath);
      expect(result).toBe("assets/user123/gen456/subfolder/file_thumb.jpg");
    });

    it("should handle files without extension", () => {
      const storagePath = "assets/user123/gen456/file";
      const result = generateThumbnailPath(storagePath);
      expect(result).toBe("assets/user123/gen456/file_thumb.jpg");
    });

    it("should handle empty filename", () => {
      const storagePath = "assets/user123/gen456/";
      const result = generateThumbnailPath(storagePath);
      expect(result).toBe("assets/user123/gen456/thumbnail_thumb.jpg");
    });
  });
});

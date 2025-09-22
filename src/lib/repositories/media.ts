import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/client";
import { getAdminFirestore } from "../firebase/server";
import type { Generation } from "../models/Generation";
import type {
  CreateMediaAsset,
  MediaAsset,
  UpdateMediaAsset,
} from "../models/MediaAsset";
import { serverStorage } from "./storage";

export class MediaAssetRepository {
  private isServer: boolean;

  constructor(isServer = false) {
    this.isServer = isServer;
  }

  private get firestore() {
    return this.isServer ? getAdminFirestore() : db;
  }

  private convertTimestamps<T>(data: Record<string, unknown>): T {
    const converted = { ...data };
    Object.keys(converted).forEach((key) => {
      if (converted[key] && typeof converted[key].toDate === "function") {
        converted[key] = converted[key].toDate();
      }
    });
    return converted as T;
  }

  async createMediaAsset(assetData: CreateMediaAsset): Promise<MediaAsset> {
    try {
      const now = new Date();
      const docRef = await addDoc(
        collection(this.firestore as never, "mediaAssets"),
        {
          ...assetData,
          createdAt: now,
        },
      );

      return {
        id: docRef.id,
        ...assetData,
        createdAt: now,
      };
    } catch (error) {
      console.error("Error creating media asset:", error);
      throw error;
    }
  }

  async getMediaAsset(id: string): Promise<MediaAsset | null> {
    try {
      const assetDoc = await getDoc(
        doc(this.firestore as never, "mediaAssets", id),
      );
      if (!assetDoc.exists()) return null;

      return this.convertTimestamps({ id: assetDoc.id, ...assetDoc.data() });
    } catch (error) {
      console.error("Error getting media asset:", error);
      throw error;
    }
  }

  async getAssetsByGeneration(generationId: string): Promise<MediaAsset[]> {
    try {
      const q = query(
        collection(this.firestore as never, "mediaAssets"),
        where("generationId", "==", generationId),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) =>
        this.convertTimestamps({ id: doc.id, ...doc.data() }),
      );
    } catch (error) {
      console.error("Error getting assets by generation:", error);
      throw error;
    }
  }

  async updateMediaAsset(id: string, updates: UpdateMediaAsset): Promise<void> {
    try {
      await updateDoc(doc(this.firestore as never, "mediaAssets", id), updates);
    } catch (error) {
      console.error("Error updating media asset:", error);
      throw error;
    }
  }

  async generateThumbnail(asset: MediaAsset): Promise<string | null> {
    if (!this.isServer) {
      throw new Error("Thumbnail generation is only available server-side");
    }

    try {
      if (
        asset.format === "png" ||
        asset.format === "jpg" ||
        asset.format === "jpeg"
      ) {
        // For images, create a smaller thumbnail
        // In a real implementation, you'd use an image processing library
        const thumbnailData = await this.createMockThumbnail();

        const thumbnailResult = await serverStorage.saveThumbnail(
          asset.storagePath,
          thumbnailData,
          {
            originalAssetId: asset.id,
            thumbnailWidth: 256,
            thumbnailHeight: 256,
          },
        );

        return thumbnailResult.url;
      } else if (asset.format === "mp4" || asset.format === "webm") {
        // For videos, extract a frame as thumbnail
        // In a real implementation, you'd use ffmpeg or similar
        const thumbnailData = await this.createMockThumbnail();

        const thumbnailResult = await serverStorage.saveThumbnail(
          asset.storagePath,
          thumbnailData,
          {
            originalAssetId: asset.id,
            thumbnailWidth: 256,
            thumbnailHeight: 256,
            extractedFromFrame: "middle",
          },
        );

        return thumbnailResult.url;
      }

      return null;
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      return null;
    }
  }

  private async createMockThumbnail(): Promise<Buffer> {
    // Create a minimal thumbnail image (1x1 PNG)
    return Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x5c, 0x72, 0xa8, 0x66, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
  }

  // Create complete asset with generation metadata
  async createAssetFromGeneration(
    generation: Generation,
    assetData: Buffer,
    format: string,
    metadata: Record<string, unknown> = {},
  ): Promise<MediaAsset> {
    if (!this.isServer) {
      throw new Error("Asset creation is only available server-side");
    }

    try {
      // Save the asset to storage
      const userId = "anonymous"; // TODO: get from generation/prompt context
      const uploadResult = await serverStorage.saveGeneratedAsset(
        userId,
        generation.id,
        assetData,
        format,
        {
          generationType: generation.type,
          model: generation.model,
          ...metadata,
        },
      );

      // Create the MediaAsset record
      const asset = await this.createMediaAsset({
        generationId: generation.id,
        url: uploadResult.url,
        storagePath: uploadResult.storagePath,
        format,
        width: metadata.width || null,
        height: metadata.height || null,
        durationSec: metadata.durationSec || null,
        altText: null, // Will be set when publishing
        captions: null, // Will be set when publishing
        visibility: "private",
      });

      // Generate thumbnail asynchronously
      this.generateThumbnail(asset)
        .then((thumbnailUrl) => {
          if (thumbnailUrl) {
            console.log(
              `Thumbnail generated for asset ${asset.id}: ${thumbnailUrl}`,
            );
            // In a real implementation, you might want to store the thumbnail URL
            // as part of the asset metadata or in a separate thumbnail field
          }
        })
        .catch((error) => {
          console.error(
            `Failed to generate thumbnail for asset ${asset.id}:`,
            error,
          );
        });

      return asset;
    } catch (error) {
      console.error("Error creating asset from generation:", error);
      throw error;
    }
  }

  // Update asset visibility and accessibility metadata
  async updateAssetForPublishing(
    assetId: string,
    visibility: MediaAsset["visibility"],
    altText?: string,
    captions?: string,
  ): Promise<void> {
    try {
      const updates: UpdateMediaAsset = {
        visibility,
      };

      if (altText !== undefined) {
        updates.altText = altText;
      }

      if (captions !== undefined) {
        updates.captions = captions;
      }

      await this.updateMediaAsset(assetId, updates);
    } catch (error) {
      console.error("Error updating asset for publishing:", error);
      throw error;
    }
  }

  // Get public assets for feed
  async getPublicAssets(maxAssets: number = 50): Promise<MediaAsset[]> {
    try {
      const q = query(
        collection(this.firestore as never, "mediaAssets"),
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc"),
        limit(maxAssets),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) =>
        this.convertTimestamps({ id: doc.id, ...doc.data() }),
      );
    } catch (error) {
      console.error("Error getting public assets:", error);
      throw error;
    }
  }
}

// Export singleton instances
export const clientMediaAssets = new MediaAssetRepository(false);
export const serverMediaAssets = new MediaAssetRepository(true);

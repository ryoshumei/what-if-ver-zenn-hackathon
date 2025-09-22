import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { storage } from "../firebase/client";
import { getAdminStorage } from "../firebase/server";
import { generateThumbnailPath } from "../models/MediaAsset";

export interface UploadResult {
  url: string;
  storagePath: string;
  metadata?: Record<string, unknown>;
}

export interface SignedUrlOptions {
  expiresIn?: number; // minutes, default 60
  action?: "read" | "write" | "delete";
}

export class StorageRepository {
  private isServer: boolean;

  constructor(isServer = false) {
    this.isServer = isServer;
  }

  private get storageInstance() {
    return this.isServer ? getAdminStorage() : storage;
  }

  async uploadAsset(
    file: File | Buffer,
    path: string,
    metadata?: Record<string, unknown>,
  ): Promise<UploadResult> {
    try {
      const storageRef = ref(this.storageInstance as never, path);

      let uploadResult: unknown;

      if (this.isServer && Buffer.isBuffer(file)) {
        // Server-side upload with Buffer
        uploadResult = await uploadBytes(storageRef, file, {
          customMetadata: metadata,
        });
      } else if (file instanceof File) {
        // Client-side upload with File
        uploadResult = await uploadBytes(storageRef, file, {
          customMetadata: metadata,
        });
      } else {
        throw new Error("Invalid file type for upload");
      }

      const url = await getDownloadURL(uploadResult.ref);

      return {
        url,
        storagePath: path,
        metadata: uploadResult.metadata,
      };
    } catch (error) {
      console.error("Error uploading asset:", error);
      throw error;
    }
  }

  async getSignedUrl(
    path: string,
    options: SignedUrlOptions = {},
  ): Promise<string> {
    try {
      if (!this.isServer) {
        // Client-side: just get the download URL
        const storageRef = ref(this.storageInstance as never, path);
        return await getDownloadURL(storageRef);
      }

      // Server-side: generate signed URL with admin SDK
      const bucket = (this.storageInstance as never).bucket();
      const file = bucket.file(path);

      const expiresIn = (options.expiresIn || 60) * 60 * 1000; // Convert minutes to milliseconds
      const action = options.action || "read";

      const [signedUrl] = await file.getSignedUrl({
        action,
        expires: Date.now() + expiresIn,
      });

      return signedUrl;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      throw error;
    }
  }

  async deleteAsset(path: string): Promise<void> {
    try {
      const storageRef = ref(this.storageInstance as never, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error("Error deleting asset:", error);
      throw error;
    }
  }

  generateAssetPath(
    userId: string,
    generationId: string,
    filename: string,
  ): string {
    return `assets/${userId}/${generationId}/${filename}`;
  }

  generateThumbnailPath(originalPath: string): string {
    return generateThumbnailPath(originalPath);
  }

  async saveGeneratedAsset(
    userId: string,
    generationId: string,
    assetData: Buffer | Uint8Array,
    format: string,
    metadata?: Record<string, unknown>,
  ): Promise<UploadResult> {
    try {
      const filename = `generated.${format}`;
      const path = this.generateAssetPath(userId, generationId, filename);

      const uploadMetadata = {
        userId,
        generationId,
        format,
        generatedAt: new Date().toISOString(),
        ...metadata,
      };

      return this.uploadAsset(Buffer.from(assetData), path, uploadMetadata);
    } catch (error) {
      console.error("Error saving generated asset:", error);
      throw error;
    }
  }

  async saveThumbnail(
    originalPath: string,
    thumbnailData: Buffer | Uint8Array,
    metadata?: Record<string, unknown>,
  ): Promise<UploadResult> {
    try {
      const thumbnailPath = this.generateThumbnailPath(originalPath);

      const uploadMetadata = {
        type: "thumbnail",
        originalPath,
        generatedAt: new Date().toISOString(),
        ...metadata,
      };

      return this.uploadAsset(
        Buffer.from(thumbnailData),
        thumbnailPath,
        uploadMetadata,
      );
    } catch (error) {
      console.error("Error saving thumbnail:", error);
      throw error;
    }
  }

  async getAssetMetadata(
    path: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      if (!this.isServer) {
        // Client-side: limited metadata access
        const _storageRef = ref(this.storageInstance as never, path);
        return null; // Client can't access metadata directly
      }

      // Server-side: get full metadata
      const bucket = (this.storageInstance as never).bucket();
      const file = bucket.file(path);

      const [metadata] = await file.getMetadata();
      return metadata.metadata || null;
    } catch (error) {
      console.error("Error getting asset metadata:", error);
      return null;
    }
  }

  async listUserAssets(userId: string, prefix?: string): Promise<string[]> {
    try {
      if (!this.isServer) {
        throw new Error("Asset listing is only available server-side");
      }

      const bucket = (this.storageInstance as never).bucket();
      const searchPrefix = prefix
        ? `assets/${userId}/${prefix}`
        : `assets/${userId}/`;

      const [files] = await bucket.getFiles({
        prefix: searchPrefix,
      });

      return files.map((file: { name: string }) => file.name);
    } catch (error) {
      console.error("Error listing user assets:", error);
      throw error;
    }
  }

  async copyAsset(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      if (!this.isServer) {
        throw new Error("Asset copying is only available server-side");
      }

      const bucket = (this.storageInstance as never).bucket();
      const sourceFile = bucket.file(sourcePath);
      const destinationFile = bucket.file(destinationPath);

      await sourceFile.copy(destinationFile);
    } catch (error) {
      console.error("Error copying asset:", error);
      throw error;
    }
  }

  async getAssetSize(path: string): Promise<number | null> {
    try {
      if (!this.isServer) {
        return null; // Client can't access file size directly
      }

      const bucket = (this.storageInstance as never).bucket();
      const file = bucket.file(path);

      const [metadata] = await file.getMetadata();
      return parseInt(metadata.size, 10) || null;
    } catch (error) {
      console.error("Error getting asset size:", error);
      return null;
    }
  }

  async cleanupExpiredAssets(expirationDays: number = 30): Promise<number> {
    try {
      if (!this.isServer) {
        throw new Error("Asset cleanup is only available server-side");
      }

      const bucket = (this.storageInstance as never).bucket();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - expirationDays);

      const [files] = await bucket.getFiles({
        prefix: "assets/",
      });

      let deletedCount = 0;

      for (const file of files) {
        const [metadata] = await file.getMetadata();
        const created = new Date(metadata.timeCreated);

        if (created < cutoffDate) {
          await file.delete();
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error("Error cleaning up expired assets:", error);
      throw error;
    }
  }
}

// Export singleton instances for both client and server
export const clientStorage = new StorageRepository(false);
export const serverStorage = new StorageRepository(true);

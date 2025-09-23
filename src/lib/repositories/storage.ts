import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import type { Storage as AdminStorage } from "firebase-admin/storage";
import { storage } from "../firebase/client";
import { getAdminStorage } from "../firebase/server";
import { generateThumbnailPath } from "../models/MediaAsset";
import { getEnv } from "../config/env";

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
      // Convert metadata to Firebase-compatible format
      const customMetadata: { [key: string]: string } = {};
      if (metadata) {
        Object.keys(metadata).forEach((key) => {
          const value = metadata[key];
          customMetadata[key] =
            typeof value === "string" ? value : String(value);
        });
      }

      if (this.isServer && Buffer.isBuffer(file)) {
        // Server-side upload with Admin SDK
        const bucket = (this.storageInstance as AdminStorage).bucket();
        const fileRef = bucket.file(path);

        // Upload the buffer
        await fileRef.save(file, {
          metadata: {
            metadata: customMetadata,
          },
        });

        // Make the file publicly readable
        await fileRef.makePublic();

        // Get the public URL
        const url = `https://storage.googleapis.com/${bucket.name}/${path}`;

        return {
          url,
          storagePath: path,
          metadata: customMetadata,
        };
      } else if (file instanceof File) {
        // Client-side upload with Client SDK
        const storageRef = ref(this.storageInstance as never, path);
        const uploadResult = await uploadBytes(storageRef, file, {
          customMetadata,
        });

        const url = await getDownloadURL(uploadResult.ref);

        return {
          url,
          storagePath: path,
          metadata: customMetadata,
        };
      } else {
        throw new Error("Invalid file type for upload");
      }
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
      const bucket = (this.storageInstance as AdminStorage).bucket();
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
      const bucket = (this.storageInstance as AdminStorage).bucket();
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

      const bucket = (this.storageInstance as AdminStorage).bucket();
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

      const bucket = (this.storageInstance as AdminStorage).bucket();
      const sourceFile = bucket.file(sourcePath);
      const destinationFile = bucket.file(destinationPath);

      await sourceFile.copy(destinationFile);
    } catch (error) {
      console.error("Error copying asset:", error);
      throw error;
    }
  }

  async publishGcsUriToPublicBucket(gcsUri: string): Promise<string> {
    if (!this.isServer) throw new Error("Publishing requires server-side");
    const env = getEnv();
    if (!env.PUBLIC_GCS_BUCKET) throw new Error("PUBLIC_GCS_BUCKET not set");

    if (!gcsUri.startsWith("gs://")) {
      throw new Error("Expected gs:// URI");
    }
    const withoutScheme = gcsUri.replace("gs://", "");
    const _srcBucket = withoutScheme.split("/")[0];
    const srcObjectPath = withoutScheme.substring(_srcBucket.length + 1);

    const admin = this.storageInstance as AdminStorage;
    const src = admin.bucket(_srcBucket).file(srcObjectPath);
    const dest = admin.bucket(env.PUBLIC_GCS_BUCKET).file(srcObjectPath);

    await src.copy(dest);
    await dest.makePublic();
    return `https://storage.googleapis.com/${env.PUBLIC_GCS_BUCKET}/${srcObjectPath}`;
  }

  async getAssetSize(path: string): Promise<number | null> {
    try {
      if (!this.isServer) {
        return null; // Client can't access file size directly
      }

      const bucket = (this.storageInstance as AdminStorage).bucket();
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

      const bucket = (this.storageInstance as AdminStorage).bucket();
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

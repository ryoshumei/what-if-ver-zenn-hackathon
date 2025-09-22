import { vertexAdapter } from "../adapters/vertex";
import {
  createGenerationLogger,
  createPerformanceLogger,
} from "../logging/logger";
import type { Generation } from "../models/Generation";
import type { MediaAsset } from "../models/MediaAsset";
import { serverFirestore } from "../repositories/firestore";
import { serverMediaAssets } from "../repositories/media";
import { serverStorage } from "../repositories/storage";

export interface JobResult {
  success: boolean;
  error?: string;
  assetUrls?: string[];
  metadata?: Record<string, unknown>;
}

export interface ProcessingStats {
  processed: number;
  failed: number;
  succeeded: number;
  averageProcessingTime: number;
}

export class GenerationJobRunner {
  private isRunning = false;
  private pollInterval = 5000; // 5 seconds
  private stats: ProcessingStats = {
    processed: 0,
    failed: 0,
    succeeded: 0,
    averageProcessingTime: 0,
  };

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("Job runner is already running");
      return;
    }

    this.isRunning = true;
    console.log("Starting generation job runner...");

    while (this.isRunning) {
      try {
        await this.processQueuedGenerations();
        await this.sleep(this.pollInterval);
      } catch (error) {
        console.error("Error in job runner loop:", error);
        await this.sleep(this.pollInterval * 2); // Back off on error
      }
    }
  }

  stop(): void {
    console.log("Stopping generation job runner...");
    this.isRunning = false;
  }

  getStats(): ProcessingStats {
    return { ...this.stats };
  }

  private async processQueuedGenerations(): Promise<void> {
    // Get all queued generations
    const queuedGenerations =
      await serverFirestore.getGenerationsByStatus("queued");

    if (queuedGenerations.length === 0) {
      return;
    }

    console.log(`Processing ${queuedGenerations.length} queued generations`);

    // Process each generation
    const promises = queuedGenerations.map((generation) =>
      this.processGeneration(generation).catch((error) => {
        console.error(`Failed to process generation ${generation.id}:`, error);
        return { success: false, error: error.message };
      }),
    );

    await Promise.allSettled(promises);
  }

  private async processGeneration(generation: Generation): Promise<JobResult> {
    const logger = createGenerationLogger(generation.id, generation.type);
    const performanceLogger = createPerformanceLogger(logger);

    try {
      logger.info("Starting generation processing", {
        generationId: generation.id,
        type: generation.type,
        model: generation.model,
      });

      // Update status to running
      await serverFirestore.updateGeneration(generation.id, {
        updatedAt: new Date(),
        status: "running",
      });

      // Get the original prompt
      if (!generation.promptId) {
        throw new Error("Generation missing promptId");
      }
      const prompt = await serverFirestore.getIdeaPrompt(generation.promptId);
      if (!prompt) {
        throw new Error("Original prompt not found");
      }

      // Process based on generation type
      const result = await performanceLogger.measure(
        `${generation.type}_generation`,
        () => this.executeGeneration(generation, prompt.text),
        { generationId: generation.id, type: generation.type },
      );

      if (result.success && result.assetUrls) {
        // Create MediaAsset record and update generation
        await this.completeGeneration(generation, result);

        logger.info("Generation completed successfully", {
          generationId: generation.id,
          assetUrls: result.assetUrls,
        });

        this.stats.succeeded++;
      } else {
        // Mark as failed
        await serverFirestore.updateGeneration(generation.id, {
          updatedAt: new Date(),
          status: "failed",
          error: result.error || "Unknown error during generation",
        });

        logger.error(
          "Generation failed",
          new Error(result.error || "Unknown error"),
          {
            generationId: generation.id,
          },
        );

        this.stats.failed++;
      }

      this.stats.processed++;
      return result;
    } catch (error) {
      logger.error("Generation processing failed", error as Error, {
        generationId: generation.id,
      });

      // Mark as failed
      await serverFirestore.updateGeneration(generation.id, {
        updatedAt: new Date(),
        status: "failed",
        error: error instanceof Error ? error.message : "Processing failed",
      });

      this.stats.failed++;
      this.stats.processed++;

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async executeGeneration(
    generation: Generation,
    prompt: string,
  ): Promise<JobResult> {
    try {
      if (generation.type === "image") {
        const result = await vertexAdapter.generateImage({
          prompt,
          type: "image",
          model: generation.model,
        });

        if (!result.success) {
          return { success: false, error: result.error };
        }

        // For now, we simulate the image generation result
        // In a real implementation, you'd get the actual generated image data
        const mockImageData = await this.createMockAsset(generation.type);
        const assetUrl = await this.saveAsset(
          generation.id,
          "anonymous",
          mockImageData,
          "png",
        );

        return {
          success: true,
          assetUrls: [assetUrl],
          metadata: {
            format: "png",
            width: 1024,
            height: 1024,
            model: generation.model,
          },
        };
      } else if (generation.type === "video") {
        const result = await vertexAdapter.generateVideo({
          prompt,
          type: "video",
          model: generation.model,
        });

        if (!result.success) {
          return { success: false, error: result.error };
        }

        // For now, we simulate the video generation result
        const mockVideoData = await this.createMockAsset(generation.type);
        const assetUrl = await this.saveAsset(
          generation.id,
          "anonymous",
          mockVideoData,
          "mp4",
        );

        return {
          success: true,
          assetUrls: [assetUrl],
          metadata: {
            format: "mp4",
            width: 1280,
            height: 720,
            durationSec: 6,
            model: generation.model,
          },
        };
      }

      return { success: false, error: "Unsupported generation type" };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Generation execution failed",
      };
    }
  }

  private async completeGeneration(
    generation: Generation,
    result: JobResult,
  ): Promise<void> {
    try {
      // Create MediaAsset records for each generated asset
      const assets: MediaAsset[] = [];

      if (result.assetUrls && result.metadata) {
        for (const _assetUrl of result.assetUrls) {
          // Create mock asset data for the MediaAsset record
          const mockAssetData = await this.createMockAsset(generation.type);

          const asset = await serverMediaAssets.createAssetFromGeneration(
            generation,
            mockAssetData,
            result.metadata.format,
            result.metadata,
          );

          assets.push(asset);
        }
      }

      // Update generation status to complete
      await serverFirestore.updateGeneration(generation.id, {
        updatedAt: new Date(),
        status: "complete",
      });

      console.log(
        `Generation ${generation.id} completed with ${assets.length} assets created`,
      );
    } catch (error) {
      console.error(`Error completing generation ${generation.id}:`, error);

      // Mark as failed if asset creation fails
      await serverFirestore.updateGeneration(generation.id, {
        updatedAt: new Date(),
        status: "failed",
        error: "Failed to create media assets",
      });

      throw error;
    }
  }

  private async saveAsset(
    generationId: string,
    userId: string,
    assetData: Buffer,
    format: string,
  ): Promise<string> {
    try {
      const uploadResult = await serverStorage.saveGeneratedAsset(
        userId,
        generationId,
        assetData,
        format,
        {
          generatedAt: new Date().toISOString(),
          format,
        },
      );

      return uploadResult.url;
    } catch (error) {
      console.error("Failed to save asset:", error);
      throw new Error("Failed to save generated asset");
    }
  }

  private async createMockAsset(type: "image" | "video"): Promise<Buffer> {
    // Create minimal mock asset data for testing
    if (type === "image") {
      // Minimal PNG header (1x1 transparent pixel)
      return Buffer.from([
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
        0x01,
        0x00,
        0x00,
        0x00,
        0x01, // 1x1 dimensions
        0x08,
        0x06,
        0x00,
        0x00,
        0x00,
        0x1f,
        0x15,
        0xc4,
        0x89,
        0x00,
        0x00,
        0x00,
        0x0a,
        0x49,
        0x44,
        0x41,
        0x54,
        0x78,
        0x9c,
        0x63,
        0x00,
        0x01,
        0x00,
        0x00,
        0x05,
        0x00,
        0x01,
        0x0d,
        0x0a,
        0x2d,
        0xb4,
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
        0x82,
      ]);
    } else {
      // Minimal MP4 header for a very short video
      return Buffer.from([
        0x00,
        0x00,
        0x00,
        0x20,
        0x66,
        0x74,
        0x79,
        0x70, // ftyp box
        0x69,
        0x73,
        0x6f,
        0x6d,
        0x00,
        0x00,
        0x02,
        0x00,
        0x69,
        0x73,
        0x6f,
        0x6d,
        0x69,
        0x73,
        0x6f,
        0x32,
        0x61,
        0x76,
        0x63,
        0x31,
        0x6d,
        0x70,
        0x34,
        0x31,
        // Add minimal mdat box
        0x00,
        0x00,
        0x00,
        0x08,
        0x6d,
        0x64,
        0x61,
        0x74,
      ]);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Health check method
  isHealthy(): boolean {
    return this.isRunning;
  }

  // Method to process a specific generation (for testing or manual processing)
  async processSpecificGeneration(generationId: string): Promise<JobResult> {
    const generation = await serverFirestore.getGeneration(generationId);
    if (!generation) {
      throw new Error("Generation not found");
    }

    return this.processGeneration(generation);
  }
}

// Singleton instance
export const jobRunner = new GenerationJobRunner();

// Auto-start in production (not in test environment)
if (process.env.NODE_ENV === "production" && typeof window === "undefined") {
  jobRunner.start().catch(console.error);
}

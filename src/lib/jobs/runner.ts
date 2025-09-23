import { vertexAdapter } from "../adapters/vertex";
import {
  createGenerationLogger,
  createPerformanceLogger,
} from "../logging/logger";
import type { Generation } from "../models/Generation";
import { serverFirestore } from "../repositories/firestore";
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

        // Use actual generated image data
        if (result.urls && result.urls.length > 0) {
          const assetUrls: string[] = [];

          for (const imageUrl of result.urls) {
            if (imageUrl.startsWith("data:image/")) {
              // Extract base64 data from data URL
              const matches = imageUrl.match(/^data:image\/\w+;base64,(.+)$/);
              if (matches) {
                const base64Data = matches[1];
                const imageBuffer = Buffer.from(base64Data, "base64");

                // Save using Firebase Storage
                const storageResult = await serverStorage.saveGeneratedAsset(
                  "anonymous", // TODO: use real user ID
                  generation.id,
                  imageBuffer,
                  "png",
                  {
                    model: generation.model,
                    width: 1024,
                    height: 1024,
                  },
                );
                assetUrls.push(storageResult.url);
              }
            }
          }

          return {
            success: true,
            assetUrls,
            metadata: {
              format: "png",
              width: 1024,
              height: 1024,
              model: generation.model,
              ...result.metadata,
            },
          };
        }

        return {
          success: false,
          error: "No image URLs returned from generation",
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

        // Poll the Vertex AI operation until completion
        if (result.jobId) {
          let attempts = 0;
          const maxAttempts = 120; // 10 minutes max (5 second intervals)

          while (attempts < maxAttempts) {
            const jobStatus = await vertexAdapter.pollJobStatus(result.jobId);

            if (jobStatus.status === "complete" && jobStatus.result) {
              // Download video from Vertex AI Storage URI and save to our storage
              const videoUrl = jobStatus.result.urls[0];

              // For now, we'll store the Vertex AI URL directly
              // In production, you'd download and re-upload to your own storage
              return {
                success: true,
                assetUrls: [videoUrl],
                metadata: {
                  format: "mp4",
                  width: 1280,
                  height: 720,
                  durationSec: 6,
                  model: generation.model,
                  vertexOperationId: result.jobId,
                  ...jobStatus.result.metadata,
                },
              };
            } else if (jobStatus.status === "failed") {
              return {
                success: false,
                error: jobStatus.error || "Video generation failed",
              };
            }

            // Wait 5 seconds before polling again
            await new Promise((resolve) => setTimeout(resolve, 5000));
            attempts++;
          }

          return { success: false, error: "Video generation timed out" };
        }

        return {
          success: false,
          error: "No job ID returned from video generation",
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
      // Update generation status to complete with asset URLs
      await serverFirestore.updateGeneration(generation.id, {
        updatedAt: new Date(),
        status: "complete",
        // Store the asset URLs directly in the generation record for now
        assetUrls: result.assetUrls,
        metadata: result.metadata,
      });

      console.log(
        `Generation ${generation.id} completed with ${result.assetUrls?.length || 0} assets created`,
      );
    } catch (error) {
      console.error(`Error completing generation ${generation.id}:`, error);

      // Mark as failed if completion fails
      await serverFirestore.updateGeneration(generation.id, {
        updatedAt: new Date(),
        status: "failed",
        error: "Failed to complete generation",
      });

      throw error;
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

// Singleton instance with global protection against multiple starts
export const jobRunner = new GenerationJobRunner();

// Global flag to prevent multiple auto-starts across imports
declare global {
  var __JOB_RUNNER_STARTED__: boolean | undefined;
}

// Auto-start in development and production (not in test environment)
if (
  process.env.NODE_ENV !== "test" &&
  typeof window === "undefined" &&
  !globalThis.__JOB_RUNNER_STARTED__
) {
  globalThis.__JOB_RUNNER_STARTED__ = true;
  jobRunner.start().catch(console.error);
}

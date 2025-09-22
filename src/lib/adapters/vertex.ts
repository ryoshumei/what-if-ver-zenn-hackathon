import { VertexAI } from "@google-cloud/vertexai";
import { getEnv } from "../config/env";

export interface ChatRequest {
  prompt: string;
  model?: string;
  stream?: boolean;
}

export interface ChatResponse {
  text: string;
  finishReason?: string;
}

export interface GenerationRequest {
  prompt: string;
  type: "image" | "video";
  model?: string;
  parameters?: Record<string, unknown>;
}

export interface GenerationResponse {
  success: boolean;
  jobId?: string;
  urls?: string[];
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface JobStatus {
  status: "pending" | "running" | "complete" | "failed";
  progress?: number;
  result?: {
    urls: string[];
    metadata: Record<string, unknown>;
  };
  error?: string;
}

export class VertexAIAdapter {
  private vertexAI: VertexAI;
  private env = getEnv();

  constructor() {
    this.vertexAI = new VertexAI({
      project: this.env.GCP_PROJECT_ID,
      location: this.env.GCP_LOCATION,
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const model = request.model || this.env.VERTEX_CHAT_MODEL;
      const generativeModel = this.vertexAI.getGenerativeModel({
        model: model,
      });

      const result = await generativeModel.generateContent(request.prompt);
      const response = result.response;

      return {
        text: response.candidates?.[0]?.content?.parts?.[0]?.text || "",
        finishReason: response.candidates?.[0]?.finishReason,
      };
    } catch (error) {
      console.error("Chat error:", error);
      throw new Error(
        `Chat failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async *chatStream(
    request: ChatRequest,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const model = request.model || this.env.VERTEX_CHAT_MODEL;
      const generativeModel = this.vertexAI.getGenerativeModel({
        model: model,
      });

      const result = await generativeModel.generateContentStream(
        request.prompt,
      );

      for await (const chunk of result.stream) {
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      console.error("Chat stream error:", error);
      throw new Error(
        `Chat stream failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async planPrompt(userPrompt: string): Promise<ChatResponse> {
    const planningPrompt = `
You are an AI prompt engineer. Help improve this user prompt for visual generation:

User prompt: "${userPrompt}"

Please enhance this prompt to be more specific, descriptive, and suitable for ${userPrompt.includes("moving") || userPrompt.includes("floating") ? "video" : "image"} generation.

Focus on:
- Visual details (colors, lighting, composition)
- Style and quality enhancers
- Clear subject and setting description
- Maintaining the user's original intent

Return only the improved prompt, nothing else.
`;

    return this.chat({
      prompt: planningPrompt,
      model: this.env.VERTEX_PLAN_MODEL,
    });
  }

  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      const model = request.model || this.env.VERTEX_IMAGE_MODEL;
      const generativeModel = this.vertexAI.getGenerativeModel({
        model: model,
      });

      const imageRequest = {
        contents: [
          {
            role: "user",
            parts: [{ text: request.prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1,
          ...request.parameters,
        },
      };

      const result = await generativeModel.generateContent(imageRequest);

      // For image generation, we need to handle the response differently
      // This is a simplified implementation - actual Vertex AI image generation
      // may have different response formats and require additional processing

      if (result.response.candidates?.[0]) {
        return {
          success: true,
          jobId: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          urls: [], // URLs would be populated from actual generation
          metadata: {
            model,
            prompt: request.prompt,
            timestamp: new Date().toISOString(),
          },
        };
      }

      return {
        success: false,
        error: "No candidates returned from image generation",
      };
    } catch (error) {
      console.error("Image generation error:", error);
      return {
        success: false,
        error: `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  async generateVideo(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      const model = request.model || this.env.VERTEX_VIDEO_MODEL;

      // Video generation is typically a longer-running job
      // This is a mock implementation for the video generation
      // In practice, you'd submit a job and poll for completion

      const jobId = `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Simulate job submission
      return {
        success: true,
        jobId,
        metadata: {
          model,
          prompt: request.prompt,
          estimatedDuration: 60, // seconds
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("Video generation error:", error);
      return {
        success: false,
        error: `Video generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  async pollJobStatus(jobId: string): Promise<JobStatus> {
    try {
      // This is a mock implementation for job polling
      // In practice, you'd query the actual Vertex AI job status

      const isVideo = jobId.startsWith("vid_");
      const isImage = jobId.startsWith("img_");

      // Simulate different job states based on time
      const now = Date.now();
      const jobTimestamp = parseInt(jobId.split("_")[1], 10);
      const elapsed = (now - jobTimestamp) / 1000; // seconds

      if (isImage) {
        if (elapsed < 5) {
          return { status: "running", progress: (elapsed / 5) * 100 };
        } else if (elapsed < 10) {
          return {
            status: "complete",
            progress: 100,
            result: {
              urls: [
                `https://storage.googleapis.com/generated-images/${jobId}.png`,
              ],
              metadata: {
                format: "png",
                width: 1024,
                height: 1024,
              },
            },
          };
        }
      }

      if (isVideo) {
        if (elapsed < 30) {
          return { status: "running", progress: (elapsed / 30) * 100 };
        } else if (elapsed < 60) {
          return {
            status: "complete",
            progress: 100,
            result: {
              urls: [
                `https://storage.googleapis.com/generated-videos/${jobId}.mp4`,
              ],
              metadata: {
                format: "mp4",
                duration: 6,
                width: 1280,
                height: 720,
              },
            },
          };
        }
      }

      // If too much time has passed, consider it failed
      return {
        status: "failed",
        error: "Generation timeout",
      };
    } catch (error) {
      return {
        status: "failed",
        error: `Failed to check job status: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  async refineGeneration(
    originalPrompt: string,
    guidance: string,
    type: "image" | "video",
  ): Promise<GenerationResponse> {
    // Combine the original prompt with refinement guidance
    const refinedPrompt = `${originalPrompt}. ${guidance}`;

    if (type === "image") {
      return this.generateImage({
        prompt: refinedPrompt,
        type: "image",
      });
    } else {
      return this.generateVideo({
        prompt: refinedPrompt,
        type: "video",
      });
    }
  }

  isHealthy(): boolean {
    // Simple health check - in practice, you might ping Vertex AI
    return !!this.vertexAI && !!this.env.GCP_PROJECT_ID;
  }
}

export const vertexAdapter = new VertexAIAdapter();

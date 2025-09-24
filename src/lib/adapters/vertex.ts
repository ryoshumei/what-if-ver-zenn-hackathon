import { VertexAI } from "@google-cloud/vertexai";
import { v1 } from "@google-cloud/aiplatform";
import { helpers } from "@google-cloud/aiplatform";
const { PredictionServiceClient } = v1;
import { GoogleAuth } from "google-auth-library";
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

      // Use the correct Prediction Service Client for Imagen models
      const clientOptions = {
        apiEndpoint: `${this.env.GCP_LOCATION}-aiplatform.googleapis.com`,
      };
      const predictionServiceClient = new PredictionServiceClient(
        clientOptions,
      );

      const endpoint = `projects/${this.env.GCP_PROJECT_ID}/locations/${this.env.GCP_LOCATION}/publishers/google/models/${model}`;

      const promptText = {
        prompt: request.prompt,
      };
      const instanceValue = helpers.toValue(promptText);
      const instances = [instanceValue];

      const parameter = {
        sampleCount: 1,
        aspectRatio: "1:1",
        safetyFilterLevel: "block_some",
        personGeneration: "allow_adult",
        ...request.parameters,
      };
      const parameters = helpers.toValue(parameter);

      const predictRequest = {
        endpoint,
        instances,
        parameters,
      };

      // Make the prediction request
      const [response] = (await (
        predictionServiceClient.predict as unknown as (
          req: unknown,
        ) => Promise<any>
      )(predictRequest as unknown)) as any;
      const predictions = response.predictions;

      if (predictions && predictions.length > 0) {
        const prediction = predictions[0];

        // Extract the base64 image data
        const bytesBase64Encoded =
          prediction.structValue?.fields?.bytesBase64Encoded?.stringValue;

        if (bytesBase64Encoded) {
          return {
            success: true,
            jobId: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            urls: [`data:image/png;base64,${bytesBase64Encoded}`],
            metadata: {
              model,
              prompt: request.prompt,
              timestamp: new Date().toISOString(),
              format: "png",
            },
          };
        }
      }

      return {
        success: false,
        error: "No image data returned from generation",
      };
    } catch (error) {
      console.error("Image generation error:", error);
      return {
        success: false,
        error: `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async getAccessToken(): Promise<string> {
    // 1) Prefer ACCESS_TOKEN if provided (dev convenience)
    if (process.env.ACCESS_TOKEN) return process.env.ACCESS_TOKEN;
    // 2) Use ADC service account and extract Bearer token robustly
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    // Prefer request headers to avoid shape differences across versions
    const headers = await (client as any).getRequestHeaders();
    const authHeader = (headers.Authorization || headers.authorization) as
      | string
      | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
    const tokenObj = await (client as any).getAccessToken();
    const tokenStr =
      typeof tokenObj === "string" ? tokenObj : (tokenObj?.token as string);
    if (!tokenStr) throw new Error("Failed to acquire access token");
    return tokenStr;
  }

  async generateVideo(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      const model = request.model || this.env.VERTEX_VIDEO_MODEL;
      const lroMode = this.env.VERTEX_VIDEO_LRO_MODE || "mock";

      if (lroMode === "rest") {
        const accessToken = await this.getAccessToken();
        const endpoint = `https://${this.env.GCP_LOCATION}-aiplatform.googleapis.com/v1beta1/projects/${this.env.GCP_PROJECT_ID}/locations/${this.env.GCP_LOCATION}/publishers/google/models/${model}:predictLongRunning`;
        const body = {
          instances: [{ prompt: request.prompt }],
          parameters: {
            sampleCount: 1,
            durationSeconds: 6,
            aspectRatio: "16:9",
            enhancePrompt: true,
            ...(this.env.GCS_OUTPUT_BUCKET
              ? { storageUri: this.env.GCS_OUTPUT_BUCKET }
              : {}),
            ...(request.parameters || {}),
          },
        };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "x-goog-user-project": this.env.GCP_PROJECT_ID,
          },
          body: JSON.stringify(body),
        } as RequestInit);

        if (!res.ok) {
          const text = await res.text();
          return { success: false, error: `REST LRO start failed: ${text}` };
        }
        const data = (await res.json()) as { name?: string };
        if (!data.name) {
          return { success: false, error: "REST LRO missing operation name" };
        }
        return {
          success: true,
          jobId: data.name,
          metadata: {
            model,
            prompt: request.prompt,
            timestamp: new Date().toISOString(),
            mode: "rest",
          },
        };
      }

      if (lroMode === "sdk") {
        const predictionClient = new PredictionServiceClient({
          projectId: this.env.GCP_PROJECT_ID,
          apiEndpoint: `${this.env.GCP_LOCATION}-aiplatform.googleapis.com`,
        });
        const endpoint = `projects/${this.env.GCP_PROJECT_ID}/locations/${this.env.GCP_LOCATION}/publishers/google/models/${model}`;
        const instance = { prompt: request.prompt };
        const parameters = {
          sampleCount: 1,
          durationSeconds: 6,
          aspectRatio: "16:9",
          enhancePrompt: true,
          ...(request.parameters || {}),
        };
        const predictionRequest = {
          endpoint,
          instances: [helpers.toValue(instance)],
          parameters: helpers.toValue(parameters),
        } as unknown as Record<string, unknown>;
        const anyClient = predictionClient as unknown as {
          predictLongRunning?: (req: unknown) => Promise<any>;
        };
        if (typeof anyClient.predictLongRunning === "function") {
          const [operation] = await anyClient.predictLongRunning(
            predictionRequest,
          );
          const opName = (operation as any)?.name as string | undefined;
          if (!opName) throw new Error("Missing operation name from SDK");
          return {
            success: true,
            jobId: opName,
            metadata: {
              model,
              prompt: request.prompt,
              parameters,
              operationName: opName,
              timestamp: new Date().toISOString(),
            },
          };
        }
        console.warn(
          "SDK predictLongRunning unavailable; falling back to mock LRO",
        );
      }

      // mock
      return {
        success: true,
        jobId: `vid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        metadata: {
          model,
          prompt: request.prompt,
          timestamp: new Date().toISOString(),
          mode: "mock",
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
      if (jobId.startsWith("projects/")) {
        const lroMode = this.env.VERTEX_VIDEO_LRO_MODE || "mock";
        if (lroMode === "rest") {
          const accessToken = await this.getAccessToken();
          const modelPath = jobId.split("/operations/")[0];
          const endpoint = `https://${this.env.GCP_LOCATION}-aiplatform.googleapis.com/v1/${modelPath}:fetchPredictOperation`;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "x-goog-user-project": this.env.GCP_PROJECT_ID,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ operationName: jobId }),
          } as RequestInit);
          if (!res.ok) {
            return { status: "failed", error: `REST LRO poll failed: ${res.status}` };
          }
          const op = (await res.json()) as any;
          if (!op.done) {
            const progress = Number(op.metadata?.progressPercent ?? 50);
            return { status: "running", progress: Math.min(isNaN(progress) ? 50 : progress, 99) };
          }
          if (op.error) {
            return { status: "failed", error: op.error.message || "Operation failed" };
          }
          // Prefer videos.gcsUri; fallback to base64 bytes if provided
          const videos = op.response?.videos as Array<{
            gcsUri?: string;
            bytesBase64Encoded?: string;
            mimeType?: string;
          }>;
          if (Array.isArray(videos) && videos.length > 0) {
            const v0 = videos[0];
            if (v0?.gcsUri) {
              return {
                status: "complete",
                progress: 100,
                result: {
                  urls: [v0.gcsUri],
                  metadata: {
                    format: "mp4",
                    width: 1280,
                    height: 720,
                    durationSec: 6,
                    operationId: jobId,
                  },
                },
              };
            }
            if (v0?.bytesBase64Encoded) {
              const mime = v0.mimeType || "video/mp4";
              const dataUrl = `data:${mime};base64,${v0.bytesBase64Encoded}`;
              return {
                status: "complete",
                progress: 100,
                result: {
                  urls: [dataUrl],
                  metadata: {
                    format: mime.includes("mp4") ? "mp4" : mime,
                    width: 1280,
                    height: 720,
                    durationSec: 6,
                    operationId: jobId,
                  },
                },
              };
            }
          }
          return { status: "failed", error: "No video URI found in REST response" };
        }
        // sdk mode or unknown -> treat as running
        return { status: "running", progress: 50 };
      }

      // legacy mocks
      const isVideo = jobId.startsWith("vid_");
      const isImage = jobId.startsWith("img_");
      const now = Date.now();
      const jobTimestamp = parseInt(jobId.split("_")[1], 10);
      const elapsed = (now - jobTimestamp) / 1000;
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
              metadata: { format: "png", width: 1024, height: 1024 },
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
              metadata: { format: "mp4", duration: 6, width: 1280, height: 720 },
            },
          };
        }
      }
      return { status: "failed", error: "Generation timeout" };
    } catch (error) {
      console.error("Error polling job status:", error);
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
    const refinedPrompt = `${originalPrompt}. ${guidance}`;
    if (type === "image") {
      return this.generateImage({ prompt: refinedPrompt, type: "image" });
    } else {
      return this.generateVideo({ prompt: refinedPrompt, type: "video" });
    }
  }

  isHealthy(): boolean {
    return !!this.vertexAI && !!this.env.GCP_PROJECT_ID;
  }
}

export const vertexAdapter = new VertexAIAdapter();

import { z } from "zod";

const envSchema = z.object({
  // Google Cloud
  GCP_PROJECT_ID: z.string().min(1),
  GCP_LOCATION: z.string().min(1),

  // Vertex AI Models
  VERTEX_CHAT_MODEL: z.string().min(1),
  VERTEX_PLAN_MODEL: z.string().min(1),
  VERTEX_IMAGE_MODEL: z.string().min(1),
  VERTEX_VIDEO_MODEL: z.string().min(1),
  // LRO mode for video generation: mock (default), sdk, rest
  VERTEX_VIDEO_LRO_MODE: z
    .enum(["mock", "sdk", "rest"]) // sdk attempts client LRO; rest uses HTTP LRO
    .default("mock"),
  // Optional GCS bucket for Veo outputs (gs://bucket/prefix/)
  GCS_OUTPUT_BUCKET: z.string().optional(),

  // Firebase Client (public)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),

  // Optional development token for Edge routes
  ACCESS_TOKEN: z.string().optional(),

  // Node environment
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (cachedEnv) {
    return cachedEnv;
  }

  try {
    cachedEnv = envSchema.parse(process.env);
    return cachedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => e.path.join(".")).join(", ");
      throw new Error(`Missing required environment variables: ${missingVars}`);
    }
    throw error;
  }
}

export function validateEnvAtStartup(): void {
  getEnv();
  console.log("✓ Environment validation passed");
}

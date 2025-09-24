import { z } from "zod";

export const GenerationSchema = z.object({
  id: z.string(),
  promptId: z.string().nullable(),
  type: z.enum(["image", "video"]),
  status: z.enum(["queued", "running", "complete", "failed"]),
  model: z.string(),
  refinementOf: z.string().nullable(),
  alignmentFeedback: z
    .object({
      matchesIntent: z.boolean().nullable(),
      note: z.string().nullable(),
    })
    .nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  error: z.string().nullable(),
  // Optional fields to persist generation outputs and metadata
  assetUrls: z.array(z.string()).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export type Generation = z.infer<typeof GenerationSchema>;

export const CreateGenerationSchema = GenerationSchema.omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  error: true,
  alignmentFeedback: true,
}).extend({
  status: z.enum(["queued", "running", "complete", "failed"]).default("queued"),
  alignmentFeedback: z
    .object({
      matchesIntent: z.boolean().nullable(),
      note: z.string().nullable(),
    })
    .nullable()
    .default(null),
});

export type CreateGeneration = z.infer<typeof CreateGenerationSchema>;

export const UpdateGenerationSchema = GenerationSchema.partial()
  .omit({
    id: true,
    promptId: true,
    type: true,
    model: true,
    refinementOf: true,
    createdAt: true,
  })
  .extend({
    updatedAt: z.date(),
  });

export type UpdateGeneration = z.infer<typeof UpdateGenerationSchema>;

export const GenerationWithAssetSchema = GenerationSchema.extend({
  asset: z
    .object({
      id: z.string(),
      url: z.string(),
      storagePath: z.string(),
      format: z.string(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      durationSec: z.number().nullable(),
      altText: z.string().nullable(),
      captions: z.string().nullable(),
      visibility: z.enum(["private", "unlisted", "public"]),
      createdAt: z.date(),
    })
    .nullable(),
});

export type GenerationWithAsset = z.infer<typeof GenerationWithAssetSchema>;

export function isGenerationComplete(generation: Generation): boolean {
  return generation.status === "complete";
}

export function isGenerationFailed(generation: Generation): boolean {
  return generation.status === "failed";
}

export function canRefineGeneration(generation: Generation): boolean {
  return generation.status === "complete";
}

export function getExpectedDuration(type: Generation["type"]): number {
  // Return expected duration in seconds
  switch (type) {
    case "image":
      return 10; // 10 seconds for image generation
    case "video":
      return 60; // 60 seconds for video generation
    default:
      return 30;
  }
}

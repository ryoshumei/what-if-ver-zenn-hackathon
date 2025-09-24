import { describe, expect, it } from "vitest";
import {
  type CreateGeneration,
  CreateGenerationSchema,
  canRefineGeneration,
  type Generation,
  GenerationSchema,
  getExpectedDuration,
  isGenerationComplete,
  isGenerationFailed,
  type UpdateGeneration,
  UpdateGenerationSchema,
} from "@/lib/models/Generation";

describe("Generation Model", () => {
  const validGeneration: Generation = {
    id: "gen-123",
    promptId: "prompt-456",
    type: "image",
    status: "complete",
    model: "imagen-2",
    refinementOf: null,
    alignmentFeedback: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:05:00Z"),
    error: null,
  };

  describe("GenerationSchema", () => {
    it("should validate a valid generation", () => {
      const result = GenerationSchema.safeParse(validGeneration);
      expect(result.success).toBe(true);
    });

    it("should require all mandatory fields", () => {
      const invalidGeneration = { ...validGeneration };
      delete (invalidGeneration as Record<string, unknown>).id;

      const result = GenerationSchema.safeParse(invalidGeneration);
      expect(result.success).toBe(false);
    });

    it("should validate type enum", () => {
      const invalidGeneration = { ...validGeneration, type: "invalid" };

      const result = GenerationSchema.safeParse(invalidGeneration);
      expect(result.success).toBe(false);
    });

    it("should validate status enum", () => {
      const invalidGeneration = { ...validGeneration, status: "invalid" };

      const result = GenerationSchema.safeParse(invalidGeneration);
      expect(result.success).toBe(false);
    });

    it("should allow nullable fields to be null", () => {
      const generation = {
        ...validGeneration,
        promptId: null,
        refinementOf: null,
        alignmentFeedback: null,
        error: null,
      };

      const result = GenerationSchema.safeParse(generation);
      expect(result.success).toBe(true);
    });

    it("should validate alignment feedback structure", () => {
      const generationWithFeedback = {
        ...validGeneration,
        alignmentFeedback: {
          matchesIntent: true,
          note: "Great result!",
        },
      };

      const result = GenerationSchema.safeParse(generationWithFeedback);
      expect(result.success).toBe(true);
    });
  });

  describe("CreateGenerationSchema", () => {
    it("should validate a valid create generation", () => {
      const createData: CreateGeneration = {
        promptId: "prompt-456",
        type: "image",
        model: "imagen-2",
        refinementOf: null,
        status: "queued",
        alignmentFeedback: null,
      };

      const result = CreateGenerationSchema.safeParse(createData);
      expect(result.success).toBe(true);
    });

    it("should provide default values", () => {
      const createData = {
        promptId: "prompt-456",
        type: "image" as const,
        model: "imagen-2",
        refinementOf: null,
      };

      const result = CreateGenerationSchema.safeParse(createData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("queued");
        expect(result.data.alignmentFeedback).toBe(null);
      }
    });
  });

  describe("UpdateGenerationSchema", () => {
    it("should validate a valid update generation", () => {
      const updateData: UpdateGeneration = {
        status: "complete",
        updatedAt: new Date(),
        error: null,
      };

      const result = UpdateGenerationSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it("should allow partial updates", () => {
      const updateData = {
        status: "failed" as const,
        error: "Generation failed",
        updatedAt: new Date(),
      };

      const result = UpdateGenerationSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it("should require updatedAt field", () => {
      const updateData = {
        status: "complete" as const,
      };

      const result = UpdateGenerationSchema.safeParse(updateData);
      expect(result.success).toBe(false);
    });
  });

  describe("isGenerationComplete", () => {
    it("should return true for complete generation", () => {
      const generation = { ...validGeneration, status: "complete" as const };
      expect(isGenerationComplete(generation)).toBe(true);
    });

    it("should return false for non-complete generation", () => {
      const generation = { ...validGeneration, status: "running" as const };
      expect(isGenerationComplete(generation)).toBe(false);
    });
  });

  describe("isGenerationFailed", () => {
    it("should return true for failed generation", () => {
      const generation = { ...validGeneration, status: "failed" as const };
      expect(isGenerationFailed(generation)).toBe(true);
    });

    it("should return false for non-failed generation", () => {
      const generation = { ...validGeneration, status: "complete" as const };
      expect(isGenerationFailed(generation)).toBe(false);
    });
  });

  describe("canRefineGeneration", () => {
    it("should return true for complete generation", () => {
      const generation = { ...validGeneration, status: "complete" as const };
      expect(canRefineGeneration(generation)).toBe(true);
    });

    it("should return false for non-complete generation", () => {
      const generation = { ...validGeneration, status: "running" as const };
      expect(canRefineGeneration(generation)).toBe(false);
    });
  });

  describe("getExpectedDuration", () => {
    it("should return 10 seconds for image generation", () => {
      expect(getExpectedDuration("image")).toBe(10);
    });

    it("should return 60 seconds for video generation", () => {
      expect(getExpectedDuration("video")).toBe(60);
    });
  });
});

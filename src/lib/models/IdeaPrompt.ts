import { z } from "zod";

export const IdeaPromptSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  text: z.string().min(1).max(2000),
  language: z.enum(["en", "zh-CN", "ja", "unknown"]),
  tags: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type IdeaPrompt = z.infer<typeof IdeaPromptSchema>;

export const CreateIdeaPromptSchema = IdeaPromptSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  language: z.enum(["en", "zh-CN", "ja", "unknown"]).default("unknown"),
  tags: z.array(z.string()).default([]),
});

export type CreateIdeaPrompt = z.infer<typeof CreateIdeaPromptSchema>;

export const UpdateIdeaPromptSchema = IdeaPromptSchema.partial()
  .omit({
    id: true,
    authorId: true,
    createdAt: true,
  })
  .extend({
    updatedAt: z.date(),
  });

export type UpdateIdeaPrompt = z.infer<typeof UpdateIdeaPromptSchema>;

export function validatePromptText(text: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!text.trim()) {
    errors.push("Prompt cannot be empty");
  }

  if (text.length > 2000) {
    errors.push("Prompt cannot exceed 2000 characters");
  }

  if (text.trim().length < 3) {
    errors.push("Prompt is too short. Please provide more detail.");
  }

  // Check for ambiguous prompts
  const ambiguousWords = ["something", "it", "that", "this", "maybe"];
  const words = text.toLowerCase().split(/\s+/);
  if (
    words.length <= 3 &&
    ambiguousWords.some((word) => words.includes(word))
  ) {
    errors.push(
      "Prompt is too ambiguous. Please be more specific about what you want to visualize.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

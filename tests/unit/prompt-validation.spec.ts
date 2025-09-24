import { describe, expect, it } from "vitest";
import { validatePromptText } from "../../src/lib/models/IdeaPrompt";

describe("Prompt Validation", () => {
  it("should validate valid prompt text", () => {
    const validText = "What if cats could fly through the clouds?";
    const result = validatePromptText(validText);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should reject empty prompt text", () => {
    const emptyText = "";
    const result = validatePromptText(emptyText);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Prompt cannot be empty");
  });

  it("should reject too long prompt text", () => {
    const longText = "a".repeat(2001);
    const result = validatePromptText(longText);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Prompt cannot exceed 2000 characters");
  });

  it("should reject too short prompt text", () => {
    const shortText = "hi";
    const result = validatePromptText(shortText);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Prompt is too short. Please provide more detail.",
    );
  });

  it("should reject ambiguous prompt text", () => {
    const ambiguousText = "something cool";
    const result = validatePromptText(ambiguousText);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Prompt is too ambiguous. Please be more specific about what you want to visualize.",
    );
  });

  it("should accept detailed prompt text", () => {
    const detailedText =
      "What if elephants could swim underwater like dolphins in a coral reef?";
    const result = validatePromptText(detailedText);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should handle multiple validation errors", () => {
    const badText = "it";
    const result = validatePromptText(badText);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.errors).toContain(
      "Prompt is too short. Please provide more detail.",
    );
    expect(result.errors).toContain(
      "Prompt is too ambiguous. Please be more specific about what you want to visualize.",
    );
  });
});

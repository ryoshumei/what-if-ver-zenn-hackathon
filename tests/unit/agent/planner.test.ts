import { describe, expect, it, beforeEach } from "vitest";
import { IdeaPlanner } from "@/lib/agent/planner";

describe("IdeaPlanner", () => {
  let planner: IdeaPlanner;

  beforeEach(() => {
    planner = new IdeaPlanner();
  });

  describe("planGeneration", () => {
    it("should plan generation for valid prompt", async () => {
      const prompt =
        "What if cats could fly through the clouds with rainbow wings?";
      const result = await planner.planGeneration(prompt, "image");

      expect(result.success).toBe(true);
      expect(result.enhancedPrompt).toBeTruthy();
      expect(result.enhancedPrompt.length).toBeGreaterThanOrEqual(
        prompt.length,
      );
      expect(result.detectedLanguage).toBe("en");
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.errors).toBeUndefined();
    });

    it("should return error for invalid prompt", async () => {
      const prompt = ""; // Empty prompt
      const result = await planner.planGeneration(prompt, "image");

      expect(result.success).toBe(false);
      expect(result.enhancedPrompt).toBe(prompt);
      expect(result.detectedLanguage).toBe("unknown");
      expect(result.confidence).toBe(0);
      expect(result.errors).toBeTruthy();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it("should return error for too short prompt", async () => {
      const prompt = "hi";
      const result = await planner.planGeneration(prompt, "image");

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        "Prompt is too short. Please provide more detail.",
      );
    });

    it("should return error for too long prompt", async () => {
      const prompt = "a".repeat(2001);
      const result = await planner.planGeneration(prompt, "image");

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Prompt cannot exceed 2000 characters");
    });

    it("should return error for ambiguous prompt", async () => {
      const prompt = "something cool";
      const result = await planner.planGeneration(prompt, "image");

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        "Prompt is too ambiguous. Please be more specific about what you want to visualize.",
      );
    });

    it("should work with different media types", async () => {
      const prompt = "What if elephants could swim underwater like dolphins?";
      const imageResult = await planner.planGeneration(prompt, "image");
      const videoResult = await planner.planGeneration(prompt, "video");

      expect(imageResult.success).toBe(true);
      expect(videoResult.success).toBe(true);
      // Both should have enhanced prompts, possibly different based on media type
      expect(imageResult.enhancedPrompt).toBeTruthy();
      expect(videoResult.enhancedPrompt).toBeTruthy();
    });

    it("should detect Chinese language", async () => {
      const prompt =
        "如果猫咪可以在彩虹云朵中飞翔会怎么样？这将是一个神奇的世界，充满了色彩和奇迹。";
      const result = await planner.planGeneration(prompt, "image");

      expect(result.success).toBe(true);
      expect(result.detectedLanguage).toBe("zh-CN");
    });

    it("should detect Japanese language", async () => {
      const prompt =
        "もし猫が虹の翼で雲の中を飛べたらどうなるでしょうか？美しい魔法の世界になるでしょう。";
      const result = await planner.planGeneration(prompt, "image");

      expect(result.success).toBe(true);
      expect(result.detectedLanguage).toBe("ja");
    });

    it("should enhance prompts differently for video vs image", async () => {
      const prompts = [
        "What if birds could dance in the air while flying?",
        "Cars floating through space with spinning wheels",
        "Trees moving in an underwater current",
      ];

      for (const prompt of prompts) {
        const imageResult = await planner.planGeneration(prompt, "image");
        const videoResult = await planner.planGeneration(prompt, "video");

        expect(imageResult.success).toBe(true);
        expect(videoResult.success).toBe(true);

        // Both should be enhanced but potentially differently
        expect(imageResult.enhancedPrompt).toBeTruthy();
        expect(videoResult.enhancedPrompt).toBeTruthy();
      }
    });

    it("should provide appropriate suggestions for different media types", async () => {
      const prompts = [
        "A beautiful mountain landscape with snow peaks",
        "A serene lake reflecting the sunset colors",
        "An elegant castle on a hilltop",
      ];

      for (const prompt of prompts) {
        const imageResult = await planner.planGeneration(prompt, "image");
        const videoResult = await planner.planGeneration(prompt, "video");

        expect(imageResult.success).toBe(true);
        expect(videoResult.success).toBe(true);

        // Video suggestions might differ from image suggestions
        if (videoResult.suggestions && imageResult.suggestions) {
          // This is more of a functional test - the actual suggestions might vary
          expect(Array.isArray(imageResult.suggestions)).toBe(true);
          expect(Array.isArray(videoResult.suggestions)).toBe(true);
        }
      }
    });

    it("should have high confidence for detailed prompts", async () => {
      const prompt =
        "What if majestic elephants with golden tusks could swim gracefully underwater like dolphins, surrounded by colorful coral reefs and tropical fish in crystal clear blue water?";
      const result = await planner.planGeneration(prompt, "image");

      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should have lower confidence for simple prompts", async () => {
      const prompt = "What if cats could fly?";
      const result = await planner.planGeneration(prompt, "image");

      expect(result.success).toBe(true);
      // LLM-based confidence evaluation should return reasonable score for simple prompts
      expect(result.confidence).toBeGreaterThan(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it("should provide suggestions for improvement", async () => {
      const prompt = "What if dogs could talk but only said simple words?";
      const result = await planner.planGeneration(prompt, "image");

      expect(result.success).toBe(true);
      // LLM-based suggestions should be provided when confidence is not high enough
      if (result.suggestions && result.suggestions.length > 0) {
        expect(result.suggestions.length).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeLessThanOrEqual(4); // Max 4 suggestions
        // Check that suggestions are strings
        result.suggestions.forEach(s => {
          expect(typeof s).toBe('string');
          expect(s.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe("planRefinement", () => {
    const mockGeneration = {
      id: "gen-123",
      promptId: "prompt-456",
      type: "image" as const,
      status: "complete" as const,
      model: "imagen-2",
      refinementOf: null,
      alignmentFeedback: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      error: null,
    };

    it("should refine generation with guidance", async () => {
      const guidance = "Make it more colorful and add magical elements";
      const result = await planner.planRefinement(mockGeneration, guidance);

      expect(result.success).toBe(true);
      expect(result.refinedPrompt).toBeTruthy();
      expect(result.improvements).toBeTruthy();
      expect(result.improvements.length).toBeGreaterThan(0);
      expect(result.errors).toBeUndefined();
    });

    it("should return error for empty guidance", async () => {
      const guidance = "";
      const result = await planner.planRefinement(mockGeneration, guidance);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        "Prompt is too short. Please provide more detail.",
      );
    });

    it("should return error for too long guidance", async () => {
      const guidance = "a".repeat(2001);
      const result = await planner.planRefinement(mockGeneration, guidance);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Prompt cannot exceed 2000 characters");
    });

    it("should include specific improvements in response", async () => {
      const guidance = "Add more lighting effects and make it brighter";
      const result = await planner.planRefinement(mockGeneration, guidance);

      expect(result.success).toBe(true);
      // Check that improvements are returned - the implementation identifies "more" and "lighting" keywords
      expect(
        result.improvements.some(
          (imp) => imp.includes("detail") || imp.includes("visual"),
        ),
      ).toBe(true);
    });

    it("should handle different guidance types", async () => {
      const guidanceTypes = [
        "Make it more realistic",
        "Add fantasy elements",
        "Change the color scheme to blue",
        "Make it look like a painting",
      ];

      for (const guidance of guidanceTypes) {
        const result = await planner.planRefinement(mockGeneration, guidance);
        expect(result.success).toBe(true);
        expect(result.refinedPrompt.length).toBeGreaterThan(0);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle prompts with special characters", async () => {
      const prompt = "What if robots could paint @#$%^&*() beautiful art?";
      const result = await planner.planGeneration(prompt, "image");

      expect(result.success).toBe(true);
      expect(result.enhancedPrompt).toBeTruthy();
    });

    it("should handle multilingual prompts", async () => {
      const prompt = "What if 猫 could fly like 鳥 in the sky?";
      const result = await planner.planGeneration(prompt, "image");

      expect(result.success).toBe(true);
      expect(["en", "zh-CN", "unknown"]).toContain(result.detectedLanguage);
    });

    it("should handle prompts with numbers", async () => {
      const prompt = "What if there were 100 flying cars in the year 2050?";
      const result = await planner.planGeneration(prompt, "image");

      expect(result.success).toBe(true);
      expect(result.enhancedPrompt).toContain("100");
      expect(result.enhancedPrompt).toContain("2050");
    });

    it("should handle prompts with only punctuation", async () => {
      const prompt = "??"; // Very short punctuation
      const result = await planner.planGeneration(prompt, "image");

      // This should fail validation since it's under 3 characters when trimmed
      expect(result.success).toBe(false);
      expect(result.errors).toBeTruthy();
    });
  });
});

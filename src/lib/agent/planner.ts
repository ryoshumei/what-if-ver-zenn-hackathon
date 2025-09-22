import type { Generation } from "../models/Generation";
import { validatePromptText } from "../models/IdeaPrompt";

export interface PlannerResult {
  success: boolean;
  enhancedPrompt: string;
  detectedLanguage: "en" | "zh-CN" | "ja" | "unknown";
  suggestedType: "image" | "video";
  confidence: number;
  errors?: string[];
  suggestions?: string[];
}

export interface RefinementResult {
  success: boolean;
  refinedPrompt: string;
  improvements: string[];
  errors?: string[];
}

export class IdeaPlanner {
  async planGeneration(
    userPrompt: string,
    preferredType?: "image" | "video",
  ): Promise<PlannerResult> {
    // Validate the input prompt
    const validation = validatePromptText(userPrompt);
    if (!validation.valid) {
      return {
        success: false,
        enhancedPrompt: userPrompt,
        detectedLanguage: "unknown",
        suggestedType: "image",
        confidence: 0,
        errors: validation.errors,
      };
    }

    try {
      // Detect language
      const detectedLanguage = this.detectLanguage(userPrompt);

      // Enhance the prompt for better generation
      const enhancedPrompt = this.enhancePrompt(userPrompt, detectedLanguage);

      // Suggest the best media type
      const suggestedType = preferredType || this.suggestMediaType(userPrompt);

      // Calculate confidence based on prompt quality
      const confidence = this.calculateConfidence(userPrompt, enhancedPrompt);

      // Generate suggestions for improvement
      const suggestions = this.generateSuggestions(userPrompt, suggestedType);

      return {
        success: true,
        enhancedPrompt,
        detectedLanguage,
        suggestedType,
        confidence,
        suggestions,
      };
    } catch (_error) {
      return {
        success: false,
        enhancedPrompt: userPrompt,
        detectedLanguage: "unknown",
        suggestedType: "image",
        confidence: 0,
        errors: ["Failed to plan generation"],
      };
    }
  }

  async planRefinement(
    originalGeneration: Generation,
    guidance: string,
  ): Promise<RefinementResult> {
    try {
      const validation = validatePromptText(guidance);
      if (!validation.valid) {
        return {
          success: false,
          refinedPrompt: guidance,
          improvements: [],
          errors: validation.errors,
        };
      }

      // Create refined prompt by combining original context with guidance
      const refinedPrompt = this.combinePromptWithGuidance(
        originalGeneration,
        guidance,
      );

      // Identify improvements made
      const improvements = this.identifyImprovements(guidance);

      return {
        success: true,
        refinedPrompt,
        improvements,
      };
    } catch (_error) {
      return {
        success: false,
        refinedPrompt: guidance,
        improvements: [],
        errors: ["Failed to plan refinement"],
      };
    }
  }

  private detectLanguage(text: string): "en" | "zh-CN" | "ja" | "unknown" {
    // Simple language detection based on character patterns
    const chinesePattern = /[\u4e00-\u9fff]/;
    const japanesePattern = /[\u3040-\u309f\u30a0-\u30ff]/;

    if (japanesePattern.test(text)) {
      return "ja";
    } else if (chinesePattern.test(text)) {
      return "zh-CN";
    } else if (/^[a-zA-Z\s.,!?;:'"()-]+$/.test(text)) {
      return "en";
    }

    return "unknown";
  }

  private enhancePrompt(
    prompt: string,
    language: "en" | "zh-CN" | "ja" | "unknown",
  ): string {
    // Add visual enhancement cues based on language
    const basePrompt = prompt.trim();

    // Add style and quality enhancers
    const enhancers = {
      en: [
        "highly detailed",
        "photorealistic",
        "professional lighting",
        "sharp focus",
        "vivid colors",
      ],
      "zh-CN": ["高度详细", "逼真", "专业照明", "清晰焦点", "鲜艳色彩"],
      ja: [
        "高度に詳細",
        "フォトリアリスティック",
        "プロ照明",
        "鮮明な焦点",
        "鮮やかな色彩",
      ],
      unknown: ["detailed", "clear", "well-lit"],
    };

    // Only enhance if the prompt seems to need it
    if (basePrompt.length < 50 && !basePrompt.includes("detailed")) {
      const langEnhancers = enhancers[language] || enhancers.unknown;
      const selectedEnhancer = langEnhancers[0]; // Use the first enhancer
      return `${basePrompt}, ${selectedEnhancer}`;
    }

    return basePrompt;
  }

  private suggestMediaType(prompt: string): "image" | "video" {
    // Keywords that suggest video content
    const videoKeywords = [
      "movement",
      "moving",
      "animation",
      "flowing",
      "dancing",
      "walking",
      "running",
      "flying",
      "floating",
      "spinning",
      "rotating",
      "transforming",
      "evolving",
      "growing",
      "changing",
      "sequence",
      "process",
      "action",
      "motion",
      "dynamic",
      "time-lapse",
      "slow-motion",
      // Non-English equivalents
      "移動",
      "動く",
      "アニメーション",
      "流れる",
      "踊る",
      "运动",
      "移动",
      "动画",
      "流动",
      "跳舞",
    ];

    const lowerPrompt = prompt.toLowerCase();
    const hasVideoKeywords = videoKeywords.some((keyword) =>
      lowerPrompt.includes(keyword.toLowerCase()),
    );

    return hasVideoKeywords ? "video" : "image";
  }

  private calculateConfidence(original: string, _enhanced: string): number {
    // Base confidence on prompt quality factors
    let confidence = 0.5;

    // Length factor (more descriptive = higher confidence)
    if (original.length > 20) confidence += 0.2;
    if (original.length > 50) confidence += 0.2;

    // Specificity factor (specific objects/scenes = higher confidence)
    const specificWords = [
      "chair",
      "robot",
      "room",
      "space",
      "garden",
      "kitchen",
      "floating",
      "modern",
    ];
    const specificity = specificWords.filter((word) =>
      original.toLowerCase().includes(word),
    ).length;
    confidence += Math.min(specificity * 0.1, 0.3);

    return Math.min(confidence, 1.0);
  }

  private generateSuggestions(
    prompt: string,
    suggestedType: "image" | "video",
  ): string[] {
    const suggestions: string[] = [];

    if (prompt.length < 20) {
      suggestions.push(
        "Try adding more details about the scene, objects, or setting",
      );
    }

    if (!prompt.includes("color") && !prompt.includes("lighting")) {
      suggestions.push("Consider describing colors, lighting, or mood");
    }

    if (suggestedType === "video" && !prompt.includes("movement")) {
      suggestions.push(
        "Describe the type of movement or action you want to see",
      );
    }

    if (suggestedType === "image" && prompt.includes("moving")) {
      suggestions.push(
        "For static images, focus on the moment or pose rather than movement",
      );
    }

    return suggestions;
  }

  private combinePromptWithGuidance(
    _generation: Generation,
    guidance: string,
  ): string {
    // This is a simplified version - in practice, you'd want to use the original prompt
    // For now, we'll create a combined prompt
    return `${guidance}, improved and refined version`;
  }

  private identifyImprovements(guidance: string): string[] {
    const improvements: string[] = [];

    if (guidance.includes("more") || guidance.includes("additional")) {
      improvements.push("Added more detail");
    }

    if (guidance.includes("better") || guidance.includes("improved")) {
      improvements.push("Enhanced quality");
    }

    if (guidance.includes("different") || guidance.includes("change")) {
      improvements.push("Modified style or approach");
    }

    if (guidance.includes("color") || guidance.includes("lighting")) {
      improvements.push("Adjusted visual elements");
    }

    return improvements.length > 0
      ? improvements
      : ["General refinement applied"];
  }
}

export const planner = new IdeaPlanner();

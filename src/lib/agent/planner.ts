import type { Generation } from "../models/Generation";
import { validatePromptText } from "../models/IdeaPrompt";
import { vertexAdapter } from "../adapters/vertex";

export interface PlannerResult {
  success: boolean;
  enhancedPrompt: string;
  detectedLanguage: "en" | "zh-CN" | "ja" | "unknown";
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
    mediaType: "image" | "video",
  ): Promise<PlannerResult> {
    // Validate the input prompt
    const validation = validatePromptText(userPrompt);
    if (!validation.valid) {
      return {
        success: false,
        enhancedPrompt: userPrompt,
        detectedLanguage: "unknown",
        confidence: 0,
        errors: validation.errors,
      };
    }

    try {
      // Detect language
      const detectedLanguage = this.detectLanguage(userPrompt);

      // Iterative enhancement with confidence evaluation
      const result = await this.enhanceWithIterativeImprovement(userPrompt, mediaType);

      return {
        success: true,
        enhancedPrompt: result.enhancedPrompt,
        detectedLanguage,
        confidence: result.confidence,
        suggestions: result.suggestions,
      };
    } catch (_error) {
      return {
        success: false,
        enhancedPrompt: userPrompt,
        detectedLanguage: "unknown",
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

  private async enhanceWithIterativeImprovement(
    originalPrompt: string,
    mediaType: "image" | "video",
  ): Promise<{ enhancedPrompt: string; confidence: number; suggestions: string[] }> {
    let currentPrompt = originalPrompt;
    let attempts = 0;
    const maxAttempts = 3;
    const minimumConfidence = 0.7;

    while (attempts < maxAttempts) {
      attempts++;

      // Enhance the current prompt
      const enhancedPrompt = await this.enhancePromptWithLLM(currentPrompt, mediaType);

      // Calculate confidence using LLM
      const confidence = await this.calculateConfidenceWithLLM(enhancedPrompt, mediaType);

      console.log(`Enhancement attempt ${attempts}: confidence = ${confidence}`);

      // If confidence is satisfactory or max attempts reached, return result
      if (confidence >= minimumConfidence || attempts >= maxAttempts) {
        const suggestions = confidence < minimumConfidence
          ? await this.generateSuggestionsWithLLM(enhancedPrompt, mediaType)
          : [];

        return {
          enhancedPrompt,
          confidence,
          suggestions,
        };
      }

      // Get suggestions for improvement and create a new prompt based on them
      const suggestions = await this.generateSuggestionsWithLLM(enhancedPrompt, mediaType);
      if (suggestions.length > 0) {
        currentPrompt = await this.refinePromptWithSuggestions(enhancedPrompt, suggestions, mediaType);
      } else {
        // If no suggestions, use current enhanced prompt
        currentPrompt = enhancedPrompt;
      }
    }

    // Fallback - should not reach here due to maxAttempts check above
    return {
      enhancedPrompt: currentPrompt,
      confidence: 0.5,
      suggestions: [],
    };
  }

  private async enhancePromptWithLLM(
    prompt: string,
    mediaType: "image" | "video",
  ): Promise<string> {
    try {
      const planningPrompt = `You are an AI prompt engineer. Help improve this user prompt for ${mediaType} generation:

User prompt: "${prompt}"

Please enhance this prompt to be more specific, descriptive, and suitable for ${mediaType} generation.

Focus on:
- Visual details (colors, lighting, composition)
- Style and quality enhancers appropriate for ${mediaType}
- Clear subject and setting description
- Maintaining the user's original intent
- ${mediaType === "video" ? "Motion, timing, and dynamic elements" : "Composition, depth, and visual clarity"}

Return only the improved prompt, nothing else.`;

      const response = await vertexAdapter.chat({
        prompt: planningPrompt,
        model: process.env.VERTEX_PLAN_MODEL || "gemini-2.5-pro",
      });

      // Return the enhanced prompt, fallback to original if LLM fails
      return response.text?.trim() || prompt;
    } catch (error) {
      console.warn("Failed to enhance prompt with LLM, using original:", error);
      return prompt;
    }
  }


  private async calculateConfidenceWithLLM(
    prompt: string,
    mediaType: "image" | "video",
  ): Promise<number> {
    try {
      const evaluationPrompt = `You are an AI prompt quality evaluator. Assess this ${mediaType} generation prompt and rate its quality.

Prompt to evaluate: "${prompt}"

Evaluate based on:
- Clarity and specificity of the subject/scene
- Visual detail level (colors, lighting, composition)
- Technical quality descriptors
- ${mediaType === "video" ? "Motion and temporal elements" : "Composition and artistic elements"}
- Overall descriptiveness and generation potential

Return ONLY a confidence score between 0.0 and 1.0 (e.g., 0.75), nothing else.`;

      const response = await vertexAdapter.chat({
        prompt: evaluationPrompt,
        model: process.env.VERTEX_PLAN_MODEL || "gemini-2.5-pro",
      });

      const confidenceText = response.text?.trim();
      const confidence = confidenceText ? parseFloat(confidenceText) : 0.5;

      // Ensure confidence is within valid range
      return Math.max(0.0, Math.min(1.0, isNaN(confidence) ? 0.5 : confidence));
    } catch (error) {
      console.warn("Failed to calculate confidence with LLM, using fallback:", error);
      // Fallback to simple length-based confidence
      return Math.min(0.3 + (prompt.length / 200), 1.0);
    }
  }

  private async generateSuggestionsWithLLM(
    prompt: string,
    mediaType: "image" | "video",
  ): Promise<string[]> {
    try {
      const suggestionPrompt = `You are an AI prompt improvement advisor. Analyze this ${mediaType} generation prompt and provide specific improvement suggestions.

Prompt to analyze: "${prompt}"

Provide 2-4 specific, actionable suggestions to improve this prompt for better ${mediaType} generation. Focus on:
- Missing visual details that would enhance the result
- Technical aspects that could be specified
- ${mediaType === "video" ? "Motion, timing, or dynamic elements" : "Composition, lighting, or artistic elements"}
- Style or quality enhancements

Format: Return suggestions as a JSON array of strings, e.g., ["Add lighting details", "Specify camera angle"]
Return ONLY the JSON array, nothing else.`;

      const response = await vertexAdapter.chat({
        prompt: suggestionPrompt,
        model: process.env.VERTEX_PLAN_MODEL || "gemini-2.5-pro",
      });

      const suggestionsText = response.text?.trim();
      if (suggestionsText) {
        try {
          const parsed = JSON.parse(suggestionsText);
          return Array.isArray(parsed) ? parsed.filter(s => typeof s === 'string') : [];
        } catch {
          // Fallback: try to extract suggestions from text
          const lines = suggestionsText.split('\n').filter(line => line.trim());
          return lines.slice(0, 4); // Max 4 suggestions
        }
      }

      return [];
    } catch (error) {
      console.warn("Failed to generate suggestions with LLM:", error);
      return [];
    }
  }

  private async refinePromptWithSuggestions(
    prompt: string,
    suggestions: string[],
    mediaType: "image" | "video",
  ): Promise<string> {
    try {
      const refinementPrompt = `You are an AI prompt engineer. Improve this ${mediaType} generation prompt by incorporating the provided suggestions.

Current prompt: "${prompt}"

Suggestions to incorporate:
${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Return an improved version of the prompt that naturally incorporates these suggestions while maintaining the original intent. Return ONLY the improved prompt, nothing else.`;

      const response = await vertexAdapter.chat({
        prompt: refinementPrompt,
        model: process.env.VERTEX_PLAN_MODEL || "gemini-2.5-pro",
      });

      return response.text?.trim() || prompt;
    } catch (error) {
      console.warn("Failed to refine prompt with suggestions:", error);
      return prompt;
    }
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

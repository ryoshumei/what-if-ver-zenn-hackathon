import {
  commonPolicyViolations,
  type PolicyFlag,
  type PolicyViolation,
} from "../models/PolicyFlag";

export interface PolicyCheckResult {
  allowed: boolean;
  flags: PolicyFlag[];
  violations: PolicyViolation[];
  recommendations?: string[];
}

export interface SafetyConfig {
  strictMode: boolean;
  blockHighSeverity: boolean;
  requireReviewMedium: boolean;
}

export class PolicyEnforcer {
  private config: SafetyConfig;

  constructor(
    config: SafetyConfig = {
      strictMode: false,
      blockHighSeverity: true,
      requireReviewMedium: true,
    },
  ) {
    this.config = config;
  }

  async checkPrompt(
    prompt: string,
    authorId: string,
  ): Promise<PolicyCheckResult> {
    const violations: PolicyViolation[] = [];
    const flags: PolicyFlag[] = [];

    // Run all safety checks
    const violenceCheck = this.checkViolence(prompt);
    const adultCheck = this.checkAdultContent(prompt);
    const harassmentCheck = this.checkHarassment(prompt);
    const misinfoCheck = this.checkMisinformation(prompt);
    const spamCheck = this.checkSpam(prompt);

    // Collect violations
    if (violenceCheck) violations.push(violenceCheck);
    if (adultCheck) violations.push(adultCheck);
    if (harassmentCheck) violations.push(harassmentCheck);
    if (misinfoCheck) violations.push(misinfoCheck);
    if (spamCheck) violations.push(spamCheck);

    // Convert violations to flags
    for (const violation of violations) {
      const resolution = this.determineResolution(violation);

      flags.push({
        id: `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        targetType: "prompt",
        targetId: `prompt_${authorId}_${Date.now()}`,
        reason: violation.reason,
        severity: violation.severity,
        resolution,
        createdAt: new Date(),
      });
    }

    // Determine if content should be allowed
    const allowed = this.shouldAllowContent(flags);

    // Generate recommendations for improvement
    const recommendations = this.generateRecommendations(violations);

    return {
      allowed,
      flags,
      violations,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  }

  async checkGeneration(
    generationId: string,
    metadata?: Record<string, unknown>,
  ): Promise<PolicyCheckResult> {
    // For now, assume generated content is pre-filtered by the AI model
    // In practice, you might want additional checks on the generated content

    const flags: PolicyFlag[] = [];
    const violations: PolicyViolation[] = [];

    // Check for any metadata-based violations
    if (metadata?.flagged) {
      violations.push({
        reason: "Generated content flagged by AI safety filters",
        severity: "medium",
        suggestion: "Try a different prompt or approach",
      });

      flags.push({
        id: `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        targetType: "generation",
        targetId: generationId,
        reason: "AI safety filter triggered",
        severity: "medium",
        resolution: "needs_review",
        createdAt: new Date(),
      });
    }

    return {
      allowed: flags.length === 0,
      flags,
      violations,
    };
  }

  private checkViolence(prompt: string): PolicyViolation | null {
    const violenceKeywords = [
      "violence",
      "violent",
      "kill",
      "death",
      "blood",
      "weapon",
      "gun",
      "knife",
      "sword",
      "fight",
      "attack",
      "war",
      "murder",
      "assault",
      "torture",
      "暴力",
      "伤害",
      "杀",
      "死亡",
      "血",
      "武器",
      "枪",
      "刀",
      "暴力",
      "傷害",
      "殺す",
      "死",
      "血",
      "武器",
      "銃",
      "ナイフ",
    ];

    // Exclude words that could be false positives in innocent contexts
    const falsePositives = [
      "harm", // too generic - could be "harmful to environment", "harmless", etc.
      "hurt", // too generic - could be "hurt feelings", "it won't hurt", etc.
    ];

    const lowerPrompt = prompt.toLowerCase();

    // Check for actual violence keywords (excluding false positives)
    const hasViolence = violenceKeywords.some((keyword) =>
      lowerPrompt.includes(keyword.toLowerCase()),
    );

    // Additional context checks to reduce false positives
    if (hasViolence) {
      // If it's a common false positive, do additional validation
      const wordsInPrompt = lowerPrompt.split(/\s+/);

      // Check if violent words appear in clearly innocent contexts
      const innocentContexts = [
        "robot vacuum",
        "floating",
        "hovering",
        "living room",
        "kitchen",
        "furniture",
        "decorative",
        "peaceful",
        "serene",
        "beautiful",
        "artistic",
      ];

      const hasInnocentContext = innocentContexts.some((context) =>
        lowerPrompt.includes(context),
      );

      // If there's innocent context and the violent word seems incidental, allow it
      if (hasInnocentContext && !this.hasExplicitViolentIntent(lowerPrompt)) {
        return null;
      }

      return commonPolicyViolations.violence;
    }

    return null;
  }

  private hasExplicitViolentIntent(prompt: string): boolean {
    const explicitViolence = [
      "kill",
      "murder",
      "assault",
      "torture",
      "shooting",
      "stabbing",
      "fighting",
      "attacking",
      "destroying",
      "blood",
      "gore",
    ];

    return explicitViolence.some((word) => prompt.includes(word));
  }

  private checkAdultContent(prompt: string): PolicyViolation | null {
    const adultKeywords = [
      "nude",
      "naked",
      "sexual",
      "explicit",
      "adult",
      "nsfw",
      "erotic",
      "provocative",
      "suggestive",
      "intimate",
      "裸",
      "性的",
      "成人",
      "エロ",
      "性的",
      "大人",
    ];

    const lowerPrompt = prompt.toLowerCase();
    const hasAdultContent = adultKeywords.some((keyword) =>
      lowerPrompt.includes(keyword.toLowerCase()),
    );

    if (hasAdultContent) {
      return commonPolicyViolations.adult;
    }

    return null;
  }

  private checkHarassment(prompt: string): PolicyViolation | null {
    const harassmentKeywords = [
      "hate",
      "discriminat",
      "racist",
      "sexist",
      "harassment",
      "bully",
      "threat",
      "intimidat",
      "offensive",
      "slur",
      "歧视",
      "骚扰",
      "威胁",
      "恐吓",
      "攻击性",
      "差別",
      "ハラスメント",
      "脅迫",
      "威嚇",
      "攻撃的",
    ];

    const lowerPrompt = prompt.toLowerCase();
    const hasHarassment = harassmentKeywords.some((keyword) =>
      lowerPrompt.includes(keyword.toLowerCase()),
    );

    if (hasHarassment) {
      return commonPolicyViolations.harassment;
    }

    return null;
  }

  private checkMisinformation(prompt: string): PolicyViolation | null {
    const misinfoKeywords = [
      "fake news",
      "conspiracy",
      "hoax",
      "false claim",
      "misinformation",
      "disinformation",
      "propaganda",
    ];

    const lowerPrompt = prompt.toLowerCase();
    const hasMisinfo = misinfoKeywords.some((keyword) =>
      lowerPrompt.includes(keyword.toLowerCase()),
    );

    if (hasMisinfo) {
      return commonPolicyViolations.misinformation;
    }

    return null;
  }

  private checkSpam(prompt: string): PolicyViolation | null {
    // Check for extremely short or repetitive content
    if (prompt.trim().length < 3) {
      return commonPolicyViolations.spam;
    }

    // Check for repetitive patterns
    const words = prompt.split(/\s+/);
    if (words.length > 1) {
      const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
      const repetitionRatio = uniqueWords.size / words.length;

      if (repetitionRatio < 0.3) {
        return commonPolicyViolations.spam;
      }
    }

    return null;
  }

  private determineResolution(
    violation: PolicyViolation,
  ): PolicyFlag["resolution"] {
    if (this.config.strictMode) {
      return violation.severity === "low" ? "needs_review" : "blocked";
    }

    switch (violation.severity) {
      case "high":
        return this.config.blockHighSeverity ? "blocked" : "needs_review";
      case "medium":
        return this.config.requireReviewMedium ? "needs_review" : "allowed";
      case "low":
        return "allowed";
      default:
        return "needs_review";
    }
  }

  private shouldAllowContent(flags: PolicyFlag[]): boolean {
    return !flags.some((flag) => flag.resolution === "blocked");
  }

  private generateRecommendations(violations: PolicyViolation[]): string[] {
    const recommendations: string[] = [];

    for (const violation of violations) {
      if (violation.suggestion) {
        recommendations.push(violation.suggestion);
      }
    }

    // Add general recommendations
    if (violations.length > 0) {
      recommendations.push(
        "Focus on positive, creative, and family-friendly content",
      );
      recommendations.push(
        "Describe scenes, objects, and environments rather than harmful situations",
      );
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  updateConfig(newConfig: Partial<SafetyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const policyEnforcer = new PolicyEnforcer();

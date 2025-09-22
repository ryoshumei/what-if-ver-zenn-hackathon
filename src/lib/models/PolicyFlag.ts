import { z } from "zod";

export const PolicyFlagSchema = z.object({
  id: z.string(),
  targetType: z.enum(["prompt", "generation"]),
  targetId: z.string(),
  reason: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  resolution: z.enum(["blocked", "allowed", "needs_review"]),
  createdAt: z.date(),
});

export type PolicyFlag = z.infer<typeof PolicyFlagSchema>;

export const CreatePolicyFlagSchema = PolicyFlagSchema.omit({
  id: true,
  createdAt: true,
});

export type CreatePolicyFlag = z.infer<typeof CreatePolicyFlagSchema>;

export const UpdatePolicyFlagSchema = PolicyFlagSchema.partial().omit({
  id: true,
  targetType: true,
  targetId: true,
  createdAt: true,
});

export type UpdatePolicyFlag = z.infer<typeof UpdatePolicyFlagSchema>;

export interface PolicyViolation {
  reason: string;
  severity: PolicyFlag["severity"];
  suggestion?: string;
}

export function shouldBlockContent(flags: PolicyFlag[]): boolean {
  return flags.some(
    (flag) =>
      flag.resolution === "blocked" ||
      (flag.severity === "high" && flag.resolution === "needs_review"),
  );
}

export function getHighestSeverity(
  flags: PolicyFlag[],
): PolicyFlag["severity"] | null {
  if (flags.length === 0) return null;

  const severityOrder: PolicyFlag["severity"][] = ["low", "medium", "high"];
  let highest: PolicyFlag["severity"] = "low";

  for (const flag of flags) {
    if (severityOrder.indexOf(flag.severity) > severityOrder.indexOf(highest)) {
      highest = flag.severity;
    }
  }

  return highest;
}

export function formatPolicyMessage(flags: PolicyFlag[]): string {
  if (flags.length === 0) return "";

  const blocked = flags.filter((f) => f.resolution === "blocked");
  const needsReview = flags.filter((f) => f.resolution === "needs_review");

  if (blocked.length > 0) {
    return `Content blocked: ${blocked[0].reason}`;
  }

  if (needsReview.length > 0) {
    return `Content requires review: ${needsReview[0].reason}`;
  }

  return "Content flagged for policy review";
}

export const commonPolicyViolations: Record<string, PolicyViolation> = {
  violence: {
    reason: "Content contains violent or harmful themes",
    severity: "high",
    suggestion: "Try describing peaceful or positive scenarios instead",
  },
  adult: {
    reason: "Content may contain adult or inappropriate themes",
    severity: "high",
    suggestion: "Focus on family-friendly content",
  },
  harassment: {
    reason: "Content may promote harassment or discrimination",
    severity: "high",
    suggestion: "Create inclusive and respectful content",
  },
  misinformation: {
    reason: "Content may spread false or misleading information",
    severity: "medium",
    suggestion: "Ensure content is factual and responsible",
  },
  spam: {
    reason: "Content appears to be spam or low quality",
    severity: "low",
    suggestion: "Provide more detailed and meaningful descriptions",
  },
};

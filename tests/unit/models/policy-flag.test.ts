import { describe, expect, it } from "vitest";
import {
  type CreatePolicyFlag,
  CreatePolicyFlagSchema,
  commonPolicyViolations,
  formatPolicyMessage,
  getHighestSeverity,
  type PolicyFlag,
  PolicyFlagSchema,
  shouldBlockContent,
  type UpdatePolicyFlag,
  UpdatePolicyFlagSchema,
} from "@/lib/models/PolicyFlag";

describe("PolicyFlag Model", () => {
  const validFlag: PolicyFlag = {
    id: "flag-123",
    targetType: "prompt",
    targetId: "prompt-456",
    reason: "Content contains violent themes",
    severity: "high",
    resolution: "blocked",
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };

  describe("PolicyFlagSchema", () => {
    it("should validate a valid policy flag", () => {
      const result = PolicyFlagSchema.safeParse(validFlag);
      expect(result.success).toBe(true);
    });

    it("should require all mandatory fields", () => {
      const invalidFlag = { ...validFlag };
      delete (invalidFlag as Record<string, unknown>).reason;

      const result = PolicyFlagSchema.safeParse(invalidFlag);
      expect(result.success).toBe(false);
    });

    it("should validate targetType enum", () => {
      const targetTypes = ["prompt", "generation"];

      targetTypes.forEach((targetType) => {
        const flag = { ...validFlag, targetType };
        const result = PolicyFlagSchema.safeParse(flag);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid targetType", () => {
      const invalidFlag = { ...validFlag, targetType: "invalid" };
      const result = PolicyFlagSchema.safeParse(invalidFlag);
      expect(result.success).toBe(false);
    });

    it("should validate severity enum", () => {
      const severities = ["low", "medium", "high"];

      severities.forEach((severity) => {
        const flag = { ...validFlag, severity };
        const result = PolicyFlagSchema.safeParse(flag);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid severity", () => {
      const invalidFlag = { ...validFlag, severity: "invalid" };
      const result = PolicyFlagSchema.safeParse(invalidFlag);
      expect(result.success).toBe(false);
    });

    it("should validate resolution enum", () => {
      const resolutions = ["blocked", "allowed", "needs_review"];

      resolutions.forEach((resolution) => {
        const flag = { ...validFlag, resolution };
        const result = PolicyFlagSchema.safeParse(flag);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid resolution", () => {
      const invalidFlag = { ...validFlag, resolution: "invalid" };
      const result = PolicyFlagSchema.safeParse(invalidFlag);
      expect(result.success).toBe(false);
    });
  });

  describe("CreatePolicyFlagSchema", () => {
    it("should validate create flag data", () => {
      const createData: CreatePolicyFlag = {
        targetType: "prompt",
        targetId: "prompt-456",
        reason: "Content contains violent themes",
        severity: "high",
        resolution: "blocked",
      };

      const result = CreatePolicyFlagSchema.safeParse(createData);
      expect(result.success).toBe(true);
    });

    it("should not accept id or createdAt", () => {
      const createData = {
        id: "flag-123",
        targetType: "prompt" as const,
        targetId: "prompt-456",
        reason: "Content contains violent themes",
        severity: "high" as const,
        resolution: "blocked" as const,
        createdAt: new Date(),
      };

      const result = CreatePolicyFlagSchema.safeParse(createData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("id");
        expect(result.data).not.toHaveProperty("createdAt");
      }
    });

    it("should require all fields except id and createdAt", () => {
      const createData = {
        targetType: "prompt" as const,
        targetId: "prompt-456",
        // missing required fields
      };

      const result = CreatePolicyFlagSchema.safeParse(createData);
      expect(result.success).toBe(false);
    });
  });

  describe("UpdatePolicyFlagSchema", () => {
    it("should validate update flag data", () => {
      const updateData: UpdatePolicyFlag = {
        reason: "Updated reason",
        resolution: "allowed",
      };

      const result = UpdatePolicyFlagSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it("should allow partial updates", () => {
      const updateData = {
        resolution: "allowed" as const,
      };

      const result = UpdatePolicyFlagSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it("should not accept protected fields", () => {
      const updateData = {
        id: "flag-123",
        targetType: "generation" as const,
        targetId: "gen-789",
        createdAt: new Date(),
        reason: "Updated reason",
      };

      const result = UpdatePolicyFlagSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("id");
        expect(result.data).not.toHaveProperty("targetType");
        expect(result.data).not.toHaveProperty("targetId");
        expect(result.data).not.toHaveProperty("createdAt");
      }
    });

    it("should allow empty update", () => {
      const updateData = {};

      const result = UpdatePolicyFlagSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });
  });

  describe("shouldBlockContent", () => {
    it("should return true for blocked flags", () => {
      const flags: PolicyFlag[] = [{ ...validFlag, resolution: "blocked" }];

      expect(shouldBlockContent(flags)).toBe(true);
    });

    it("should return true for high severity needs_review flags", () => {
      const flags: PolicyFlag[] = [
        { ...validFlag, severity: "high", resolution: "needs_review" },
      ];

      expect(shouldBlockContent(flags)).toBe(true);
    });

    it("should return false for allowed flags", () => {
      const flags: PolicyFlag[] = [{ ...validFlag, resolution: "allowed" }];

      expect(shouldBlockContent(flags)).toBe(false);
    });

    it("should return false for medium/low severity needs_review flags", () => {
      const flags: PolicyFlag[] = [
        { ...validFlag, severity: "medium", resolution: "needs_review" },
        { ...validFlag, severity: "low", resolution: "needs_review" },
      ];

      expect(shouldBlockContent(flags)).toBe(false);
    });

    it("should return false for empty flags array", () => {
      expect(shouldBlockContent([])).toBe(false);
    });

    it("should return true if any flag triggers blocking", () => {
      const flags: PolicyFlag[] = [
        { ...validFlag, resolution: "allowed" },
        { ...validFlag, resolution: "blocked" },
        { ...validFlag, resolution: "needs_review" },
      ];

      expect(shouldBlockContent(flags)).toBe(true);
    });
  });

  describe("getHighestSeverity", () => {
    it("should return null for empty flags array", () => {
      expect(getHighestSeverity([])).toBe(null);
    });

    it("should return severity for single flag", () => {
      const flags: PolicyFlag[] = [{ ...validFlag, severity: "medium" }];

      expect(getHighestSeverity(flags)).toBe("medium");
    });

    it("should return highest severity from multiple flags", () => {
      const flags: PolicyFlag[] = [
        { ...validFlag, id: "flag-1", severity: "low" },
        { ...validFlag, id: "flag-2", severity: "high" },
        { ...validFlag, id: "flag-3", severity: "medium" },
      ];

      expect(getHighestSeverity(flags)).toBe("high");
    });

    it("should handle all same severity", () => {
      const flags: PolicyFlag[] = [
        { ...validFlag, id: "flag-1", severity: "medium" },
        { ...validFlag, id: "flag-2", severity: "medium" },
      ];

      expect(getHighestSeverity(flags)).toBe("medium");
    });

    it("should handle severity order correctly", () => {
      const testCases = [
        { severities: ["low"], expected: "low" },
        { severities: ["low", "medium"], expected: "medium" },
        { severities: ["medium", "high"], expected: "high" },
        { severities: ["low", "medium", "high"], expected: "high" },
      ];

      testCases.forEach(({ severities, expected }) => {
        const flags = severities.map((severity, index) => ({
          ...validFlag,
          id: `flag-${index}`,
          severity: severity as PolicyFlag["severity"],
        }));

        expect(getHighestSeverity(flags)).toBe(expected);
      });
    });
  });

  describe("formatPolicyMessage", () => {
    it("should return empty string for empty flags array", () => {
      expect(formatPolicyMessage([])).toBe("");
    });

    it("should prioritize blocked flags", () => {
      const flags: PolicyFlag[] = [
        {
          ...validFlag,
          id: "flag-1",
          resolution: "needs_review",
          reason: "Review reason",
        },
        {
          ...validFlag,
          id: "flag-2",
          resolution: "blocked",
          reason: "Block reason",
        },
      ];

      const message = formatPolicyMessage(flags);
      expect(message).toBe("Content blocked: Block reason");
    });

    it("should show needs_review message when no blocked flags", () => {
      const flags: PolicyFlag[] = [
        {
          ...validFlag,
          id: "flag-1",
          resolution: "needs_review",
          reason: "Review reason",
        },
        {
          ...validFlag,
          id: "flag-2",
          resolution: "allowed",
          reason: "Allowed reason",
        },
      ];

      const message = formatPolicyMessage(flags);
      expect(message).toBe("Content requires review: Review reason");
    });

    it("should show generic message for other cases", () => {
      const flags: PolicyFlag[] = [
        { ...validFlag, resolution: "allowed", reason: "Allowed content" },
      ];

      const message = formatPolicyMessage(flags);
      expect(message).toBe("Content flagged for policy review");
    });

    it("should use first blocked flag reason", () => {
      const flags: PolicyFlag[] = [
        {
          ...validFlag,
          id: "flag-1",
          resolution: "blocked",
          reason: "First reason",
        },
        {
          ...validFlag,
          id: "flag-2",
          resolution: "blocked",
          reason: "Second reason",
        },
      ];

      const message = formatPolicyMessage(flags);
      expect(message).toBe("Content blocked: First reason");
    });
  });

  describe("commonPolicyViolations", () => {
    it("should contain expected violation types", () => {
      const expectedTypes = [
        "violence",
        "adult",
        "harassment",
        "misinformation",
        "spam",
      ];

      expectedTypes.forEach((type) => {
        expect(commonPolicyViolations).toHaveProperty(type);
        expect(commonPolicyViolations[type]).toHaveProperty("reason");
        expect(commonPolicyViolations[type]).toHaveProperty("severity");
        expect(commonPolicyViolations[type]).toHaveProperty("suggestion");
      });
    });

    it("should have appropriate severity levels", () => {
      const expectedSeverities = {
        violence: "high",
        adult: "high",
        harassment: "high",
        misinformation: "medium",
        spam: "low",
      };

      Object.entries(expectedSeverities).forEach(([type, expectedSeverity]) => {
        expect(commonPolicyViolations[type].severity).toBe(expectedSeverity);
      });
    });

    it("should have valid violation structure", () => {
      Object.values(commonPolicyViolations).forEach((violation) => {
        expect(typeof violation.reason).toBe("string");
        expect(violation.reason.length).toBeGreaterThan(0);
        expect(["low", "medium", "high"]).toContain(violation.severity);
        expect(typeof violation.suggestion).toBe("string");
        expect(violation.suggestion?.length).toBeGreaterThan(0);
      });
    });
  });
});

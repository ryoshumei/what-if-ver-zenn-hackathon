import { describe, expect, it } from "vitest";
import {
  type CreateUser,
  CreateUserSchema,
  type UpdateUser,
  UpdateUserSchema,
  type User,
  UserSchema,
} from "@/lib/models/User";

describe("User Model", () => {
  const validUser: User = {
    id: "user-123",
    displayName: "John Doe",
    photoURL: "https://example.com/avatar.jpg",
    locale: "en",
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };

  describe("UserSchema", () => {
    it("should validate a valid user", () => {
      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it("should require all mandatory fields", () => {
      const invalidUser = { ...validUser };
      delete (invalidUser as Record<string, unknown>).displayName;

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it("should validate locale enum", () => {
      const invalidUser = { ...validUser, locale: "invalid" };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it("should allow supported locales", () => {
      const locales = ["en", "zh-CN", "ja"] as const;

      locales.forEach((locale) => {
        const user = { ...validUser, locale };
        const result = UserSchema.safeParse(user);
        expect(result.success).toBe(true);
      });
    });

    it("should allow photoURL to be null", () => {
      const user = { ...validUser, photoURL: null };
      const result = UserSchema.safeParse(user);
      expect(result.success).toBe(true);
    });

    it("should validate date fields", () => {
      const user = { ...validUser, createdAt: "invalid-date" };
      const result = UserSchema.safeParse(user);
      expect(result.success).toBe(false);
    });
  });

  describe("CreateUserSchema", () => {
    it("should validate a valid create user", () => {
      const createData: CreateUser = {
        displayName: "John Doe",
        photoURL: "https://example.com/avatar.jpg",
        locale: "en",
      };

      const result = CreateUserSchema.safeParse(createData);
      expect(result.success).toBe(true);
    });

    it("should provide default locale", () => {
      const createData = {
        displayName: "John Doe",
        photoURL: "https://example.com/avatar.jpg",
      };

      const result = CreateUserSchema.safeParse(createData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.locale).toBe("en");
      }
    });

    it("should not accept id or createdAt", () => {
      const createData = {
        id: "user-123",
        displayName: "John Doe",
        photoURL: "https://example.com/avatar.jpg",
        locale: "en" as const,
        createdAt: new Date(),
      };

      const result = CreateUserSchema.safeParse(createData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("id");
        expect(result.data).not.toHaveProperty("createdAt");
      }
    });

    it("should require displayName", () => {
      const createData = {
        photoURL: "https://example.com/avatar.jpg",
        locale: "en" as const,
      };

      const result = CreateUserSchema.safeParse(createData);
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateUserSchema", () => {
    it("should validate a valid update user", () => {
      const updateData: UpdateUser = {
        displayName: "Jane Doe",
        locale: "ja",
      };

      const result = UpdateUserSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it("should allow partial updates", () => {
      const updateData = {
        displayName: "Jane Doe",
      };

      const result = UpdateUserSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it("should allow photoURL update", () => {
      const updateData = {
        photoURL: "https://example.com/new-avatar.jpg",
      };

      const result = UpdateUserSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it("should allow setting photoURL to null", () => {
      const updateData = {
        photoURL: null,
      };

      const result = UpdateUserSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it("should not accept id or createdAt", () => {
      const updateData = {
        id: "user-123",
        displayName: "Jane Doe",
        createdAt: new Date(),
      };

      const result = UpdateUserSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("id");
        expect(result.data).not.toHaveProperty("createdAt");
      }
    });

    it("should validate locale enum in updates", () => {
      const updateData = {
        locale: "invalid" as "en" | "zh-CN" | "ja",
      };

      const result = UpdateUserSchema.safeParse(updateData);
      expect(result.success).toBe(false);
    });

    it("should allow empty update", () => {
      const updateData = {};

      const result = UpdateUserSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });
  });
});

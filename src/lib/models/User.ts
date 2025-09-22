import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  photoURL: z.string().nullable(),
  locale: z.enum(["en", "zh-CN", "ja"]),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
}).extend({
  locale: z.enum(["en", "zh-CN", "ja"]).default("en"),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = UserSchema.partial().omit({
  id: true,
  createdAt: true,
});

export type UpdateUser = z.infer<typeof UpdateUserSchema>;

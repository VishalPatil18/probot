import { z } from "zod";

export const USERNAME_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export const RESERVED_SLUGS = new Set<string>([
  "admin",
  "api",
  "dashboard",
  "login",
  "register",
  "widget",
  "u",
  "settings",
]);

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    USERNAME_REGEX,
    "Username must be lowercase letters, numbers, or hyphens (no leading/trailing hyphens)",
  )
  .refine((value) => !RESERVED_SLUGS.has(value), {
    message: "This username is reserved",
  });

export const registerInput = z.object({
  username: usernameSchema,
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200, "Password must be at most 200 characters"),
});

export const loginInput = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

export const forgotPasswordInput = z.object({
  email: z.string().email("Invalid email address").max(255),
});

export const resetPasswordInput = z.object({
  token: z.string().min(32).max(128),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200, "Password must be at most 200 characters"),
});

export const verifyEmailInput = z.object({
  token: z.string().min(32).max(128),
});

export type RegisterInput = z.infer<typeof registerInput>;
export type LoginInput = z.infer<typeof loginInput>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInput>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInput>;
export type VerifyEmailInput = z.infer<typeof verifyEmailInput>;

import { z } from "zod";

import { usernameSchema } from "@/lib/auth/schemas";

export const profileUpdateInput = z.object({
  name: z.string().trim().max(100, "Name must be at most 100 characters"),
  username: usernameSchema,
});

export const passwordChangeInput = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(200),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200, "Password must be at most 200 characters"),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateInput>;
export type PasswordChangeInput = z.infer<typeof passwordChangeInput>;

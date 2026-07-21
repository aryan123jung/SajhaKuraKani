import z from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password must be at most 128 characters long")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[0-9]/, "Password must include at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character");

export const UserSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z.email().trim().toLowerCase(),
  password: passwordSchema,
  confirmPassword: passwordSchema,
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_.-]+$/, "Username can only contain letters, numbers, dots, dashes, and underscores"),
  bio: z.string().trim().max(280).optional(),
  role: z.enum(["user", "admin"]).optional().default("user"),
  profileUrl: z.string().trim().max(255).optional(),
  coverUrl: z.string().trim().max(255).optional(),
});

export type UserType = z.infer<typeof UserSchema>;

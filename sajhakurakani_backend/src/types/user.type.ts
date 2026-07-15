import z, { email } from "zod";

export const UserSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
    username: z.string().min(3),
    role: z.enum(['user', 'admin']).optional().default('user'),
    profileUrl: z.string().optional(),
    coverUrl: z.string().optional()
});

export type UserType = z.infer<typeof UserSchema>;
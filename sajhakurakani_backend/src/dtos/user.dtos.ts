import z from "zod";
import { UserSchema, passwordSchema } from "../types/user.type";

export const CreateUserDto = UserSchema.pick(
    {
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        password: true,
        confirmPassword: true,
        profileUrl: true,
        coverUrl: true
    }
).refine(
    (data) => data.password === data.confirmPassword,
    {
        message: "Password do not match",
        path: ['confirmPassword']
    }
)
export type CreateUserDto = z.infer<typeof CreateUserDto>;

export const LoginUserDto = z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1).max(128),
});
export type LoginUserDto = z.infer<typeof LoginUserDto>;


export const UpdateUserDto = UserSchema.pick({
    firstName: true,
    lastName: true,
    username: true,
    email: true,
    profileUrl: true,
    coverUrl: true
}).partial();
export type UpdateUserDto = z.infer<typeof UpdateUserDto>;

export const RequestPasswordResetDto = z.object({
    email: z.email().trim().toLowerCase(),
});
export type RequestPasswordResetDto = z.infer<typeof RequestPasswordResetDto>;

export const RequestEmailVerificationDto = z.object({
    email: z.email().trim().toLowerCase(),
});
export type RequestEmailVerificationDto = z.infer<typeof RequestEmailVerificationDto>;

export const ResetPasswordDto = z.object({
    newPassword: passwordSchema,
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordDto>;

export const VerifyTotpDto = z.object({
    code: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
});
export type VerifyTotpDto = z.infer<typeof VerifyTotpDto>;

export const GoogleOAuthExchangeDto = z.object({
    code: z.string().min(1),
    state: z.string().min(1),
});
export type GoogleOAuthExchangeDto = z.infer<typeof GoogleOAuthExchangeDto>;

export const VerifyGoogleOAuthTotpDto = z.object({
    preAuthToken: z.string().min(1),
    code: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
});
export type VerifyGoogleOAuthTotpDto = z.infer<typeof VerifyGoogleOAuthTotpDto>;

export const VerifyLoginTotpDto = z.object({
    preAuthToken: z.string().min(1),
    code: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
});
export type VerifyLoginTotpDto = z.infer<typeof VerifyLoginTotpDto>;

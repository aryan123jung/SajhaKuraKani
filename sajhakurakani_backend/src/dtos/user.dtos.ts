import z, { email } from "zod";
import { UserSchema } from "../types/user.type";

export const CreateUserDto = UserSchema.pick(
    {
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        password: true,
        confirmPassword: true,
        profileUrl: true,
        coverUrl: true,
        role: true
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
    email: z.email(),
    password: z.string().min(6),
});
export type LoginUserDto = z.infer<typeof LoginUserDto>;


export const UpdateUserDto = UserSchema.partial();
export type UpdateUserDto = z.infer<typeof UpdateUserDto>;





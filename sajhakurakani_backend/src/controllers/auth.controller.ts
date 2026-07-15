import { UserService } from "../services/user.services";
import { Request, Response } from "express";
import z, { success } from "zod";
import { CreateUserDto, LoginUserDto, UpdateUserDto } from "../dtos/user.dtos";
import { QueryParams } from "../types/query.type";

let userService = new UserService();
export class AuthController {
    async createUser(req: Request, res: Response) {
        try {
            const parsedData = CreateUserDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: z.prettifyError(parsedData.error) }
                )
            }
            const newUser = await userService.registerUser(parsedData.data);
            return res.status(201).json(
                { success: true, message: 'Register Successful', data: newUser }
            )
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Iternal Server Error" }
            )
        }
    };

    async loginUser(req: Request, res: Response) {
        try {
            const parsedData = LoginUserDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: z.prettifyError(parsedData.error) }
                )
            }
            const { token, user } = await userService.loginUser(parsedData.data);
            return res.status(200).json(
                { success: true, message: 'Login Successful', data: user, token }
            )
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            )
        }
    }
    async getCurrentUser(req: Request, res: Response) {
        try {
            const userId = req.user?._id.toString();
            const requestedUserId = req.params.id;
            if (!userId) {
                return res.status(400).json(
                    { success: false, message: "User ID not provided" }
                )
            }

            // console.log("Requested User ID:", requestedUserId);
            // console.log("User ID:", userId);

            if (requestedUserId && requestedUserId !== userId) {
                // Additional authorization checks can be added here
                return res.status(403).json(
                    { success: false, message: "Access denied to the requested user data" }
                );
            }
            const user = await userService.getUserById(requestedUserId);
            return res.status(200).json(
                { success: true, message: "User fetched successfully", data: user }
            )
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            )
        }
    }

    async getUserById(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(400).json(
                    { success: false, message: "User ID not provided" }
                )
            }
            const user = await userService.getUserById(userId);
            return res.status(200).json(
                { success: true, message: "User fetched successfully", data: user }
            )
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            )
        }
    }

    async searchUsers(req: Request, res: Response) {
        try {
            const currentUserId = req.user?._id?.toString();
            if (!currentUserId) {
                return res.status(400).json(
                    { success: false, message: "User ID not provided" }
                );
            }

            const { page, size, search }: QueryParams = req.query;
            const { users, pagination } = await userService.searchUsersForUser(
                currentUserId,
                page,
                size,
                search
            );

            return res.status(200).json(
                { success: true, data: users, pagination, message: "Users fetched successfully" }
            );
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async updateUser(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(400).json({ success: false, message: "User ID not provided" });
            }

            const parsedData = UpdateUserDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedData.error),
                });
            }

            const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

            // store only filename
            if (files?.profileUrl?.[0]) {
                parsedData.data.profileUrl = files.profileUrl[0].filename;
            }

            if (files?.coverUrl?.[0]) {
                parsedData.data.coverUrl = files.coverUrl[0].filename;
            }

            const updatedUser = await userService.updateUser(userId, parsedData.data);
            if (!updatedUser) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            const userObj = updatedUser.toObject();

            // only file name in db
            const host = `${req.protocol}://${req.get("host")}`;
            userObj.profileUrl = userObj.profileUrl ? `${userObj.profileUrl}` : null;
            userObj.coverUrl = userObj.coverUrl ? `${userObj.coverUrl}` : null;

            return res.status(200).json({
                success: true,
                message: "User updated successfully",
                data: userObj,
            });

        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

}

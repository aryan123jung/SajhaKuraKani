import { UserService } from "../services/user.services";
import { Request, Response } from "express";
import z from "zod";
import {
    BlockUserDto,
    CreateFriendRequestReportDto,
    CreateUserDto,
    FriendOverviewQueryDto,
    FriendRequestParamsDto,
    GoogleOAuthExchangeDto,
    LoginUserDto,
    RemoveFriendParamsDto,
    RefreshSessionDto,
    RequestEmailVerificationDto,
    RequestPasswordResetDto,
    ResetPasswordDto,
    SearchUsersQueryDto,
    SendFriendRequestDto,
    UnblockUserParamsDto,
    VerifyGoogleOAuthTotpDto,
    VerifyLoginTotpDto,
    VerifyTotpDto,
    UpdateUserDto,
    HumanVerificationDto
} from "../dtos/user.dtos";
import { getClientIp } from "../middleware/rate-limit.middleware";
import { HumanVerificationService } from "../security/human-verification.service";

let userService = new UserService();
const humanVerificationService = new HumanVerificationService();
export class AuthController {
    async createUser(req: Request, res: Response) {
        try {
            const parsedData = CreateUserDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: z.prettifyError(parsedData.error) }
                )
            }
            await humanVerificationService.assertHumanVerification(
                parsedData.data.captchaToken,
                getClientIp(req)
            );
            const newUser = await userService.registerUser(
                parsedData.data,
                req.ip,
                typeof req.headers["user-agent"] === "string"
                    ? req.headers["user-agent"]
                    : undefined
            );
            return res.status(201).json(
                {
                    success: true,
                    message: "Registration successful. Verify your email before signing in.",
                    data: newUser
                }
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
            await humanVerificationService.assertHumanVerification(
                parsedData.data.captchaToken,
                getClientIp(req)
            );
            const data = await userService.loginUser(
                parsedData.data,
                getClientIp(req),
                typeof req.headers["user-agent"] === "string"
                    ? req.headers["user-agent"]
                    : undefined
            );
            return res.status(200).json(
                {
                    success: true,
                    message: data.requiresTotp
                        ? "TOTP verification is required to complete sign-in"
                        : "Login Successful",
                    data: {
                        user: data.user,
                        requiresTotp: data.requiresTotp,
                        preAuthToken: data.requiresTotp ? data.preAuthToken : undefined
                    },
                    accessToken: data.requiresTotp ? undefined : data.accessToken,
                    refreshToken: data.requiresTotp ? undefined : data.refreshToken
                }
            )
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            )
        }
    }
    async verifyLoginTotp(req: Request, res: Response) {
        try {
            const parsedData = VerifyLoginTotpDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: z.prettifyError(parsedData.error) }
                );
            }

            const data = await userService.completePasswordTotpLogin(
                parsedData.data.preAuthToken,
                parsedData.data.code,
                getClientIp(req),
                typeof req.headers["user-agent"] === "string"
                    ? req.headers["user-agent"]
                    : undefined
            );

            return res.status(200).json({
                success: true,
                message: "Sign-in completed successfully",
                data: data.user,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            )
        }
    }

    async refreshSession(req: Request, res: Response) {
        try {
            const parsedData = RefreshSessionDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: z.prettifyError(parsedData.error) }
                );
            }

            const data = await userService.refreshSession(
                parsedData.data.refreshToken,
                getClientIp(req),
                typeof req.headers["user-agent"] === "string"
                    ? req.headers["user-agent"]
                    : undefined
            );

            return res.status(200).json({
                success: true,
                message: "Session refreshed successfully",
                data: data.user,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
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

    async getSearchableUserProfile(req: Request, res: Response) {
        try {
            const currentUserId = req.user?._id?.toString();
            if (!currentUserId) {
                return res.status(400).json(
                    { success: false, message: "User ID not provided" }
                );
            }

            const requestedUserId = req.params.id;
            if (!requestedUserId) {
                return res.status(400).json(
                    { success: false, message: "User ID not provided" }
                );
            }

            const user = await userService.getSearchableUserProfileById(currentUserId, requestedUserId);
            return res.status(200).json(
                { success: true, message: "User fetched successfully", data: user }
            );
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
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

            const parsedQuery = SearchUsersQueryDto.safeParse(req.query);
            if (!parsedQuery.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedQuery.error),
                });
            }

            const { users, pagination } = await userService.searchUsersForUser(
                currentUserId,
                String(parsedQuery.data.page),
                String(parsedQuery.data.size),
                parsedQuery.data.search
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

            const updatedUser = await userService.updateUser(userId, parsedData.data, files);
            if (!updatedUser) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            const userObj = { ...updatedUser };

            // only file name in db
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


    async requestPasswordChange(req: Request, res: Response) {
        try {
            const parsedData = RequestPasswordResetDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: z.prettifyError(parsedData.error) }
                );
            }

            await userService.sendResetPasswordEmail(
                parsedData.data.email,
                req.ip,
                typeof req.headers["user-agent"] === "string"
                    ? req.headers["user-agent"]
                    : undefined
            );
            return res.status(200).json(
                {
                    success: true,
                    message: "If an account exists for that email, a password reset link has been sent"
                }
            );
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            )
        }
    }

    async requestEmailVerification(req: Request, res: Response) {
        try {
            const parsedData = RequestEmailVerificationDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: z.prettifyError(parsedData.error) }
                );
            }

            await userService.resendEmailVerificationEmail(
                parsedData.data.email,
                req.ip,
                typeof req.headers["user-agent"] === "string"
                    ? req.headers["user-agent"]
                    : undefined
            );
            return res.status(200).json({
                success: true,
                message: "If an account exists for that email, a verification link has been sent"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async verifyEmail(req: Request, res: Response) {
        try {
            const token = req.params.token;
            const data = await userService.verifyEmail(
                token,
                req.ip,
                typeof req.headers["user-agent"] === "string"
                    ? req.headers["user-agent"]
                    : undefined
            );
            return res.status(200).json({
                success: true,
                message: "Email verified successfully",
                data
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async validateResetPasswordToken(req: Request, res: Response) {
        try {
            const token = req.params.token;
            const data = await userService.validateResetPasswordToken(token, req.ip);
            return res.status(200).json(
                { success: true, message: "Reset link is valid", data }
            );
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            )
        }
    }


    async resetPassword(req: Request, res: Response) {
        try {
            const parsedData = ResetPasswordDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: z.prettifyError(parsedData.error) }
                );
            }

            const token = req.params.token;
            await userService.resetPassword(
                token,
                parsedData.data.newPassword,
                req.ip,
                typeof req.headers["user-agent"] === "string"
                    ? req.headers["user-agent"]
                    : undefined
            );
            return res.status(200).json(
                { success: true, message: "Password has been reset successfully." }
            );
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async getGoogleOAuthUrl(req: Request, res: Response) {
        try {
            const parsedData = HumanVerificationDto.safeParse(req.body ?? {});
            if (!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: z.prettifyError(parsedData.error) }
                );
            }
            await humanVerificationService.assertHumanVerification(
                parsedData.data.captchaToken,
                getClientIp(req)
            );
            const data = await userService.getGoogleOAuthUrl();
            return res.status(200).json({ success: true, data });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async exchangeGoogleOAuthCode(req: Request, res: Response) {
        try {
            const parsedData = GoogleOAuthExchangeDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: z.prettifyError(parsedData.error) }
                );
            }

            const data = await userService.loginWithGoogleOAuth(
                parsedData.data.code,
                parsedData.data.state,
                getClientIp(req),
                typeof req.headers["user-agent"] === "string"
                    ? req.headers["user-agent"]
                    : undefined
            );

            return res.status(200).json({
                success: true,
                message: data.requiresTotp
                    ? "TOTP verification is required to complete Google sign-in"
                    : "Google login successful",
                    data: {
                        user: data.user,
                        requiresTotp: data.requiresTotp,
                        preAuthToken: data.requiresTotp ? data.preAuthToken : undefined
                    },
                accessToken: data.requiresTotp ? undefined : data.accessToken,
                refreshToken: data.requiresTotp ? undefined : data.refreshToken
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async verifyGoogleOAuthTotp(req: Request, res: Response) {
        try {
            const parsedData = VerifyGoogleOAuthTotpDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: z.prettifyError(parsedData.error) }
                );
            }

            const data = await userService.completeGoogleTotpLogin(
                parsedData.data.preAuthToken,
                parsedData.data.code,
                getClientIp(req),
                typeof req.headers["user-agent"] === "string"
                    ? req.headers["user-agent"]
                    : undefined
            );

            return res.status(200).json({
                success: true,
                message: "Google sign-in completed successfully",
                data: data.user,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async setupTotp(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const data = await userService.startTotpSetup(userId);
            return res.status(200).json({
                success: true,
                message: "TOTP setup initialized",
                data
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async enableTotp(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const parsedData = VerifyTotpDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: z.prettifyError(parsedData.error) }
                );
            }

            await userService.enableTotp(userId, parsedData.data.code);
            return res.status(200).json({
                success: true,
                message: "TOTP has been enabled successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async disableTotp(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const parsedData = VerifyTotpDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: z.prettifyError(parsedData.error) }
                );
            }

            await userService.disableTotp(userId, parsedData.data.code);
            return res.status(200).json({
                success: true,
                message: "TOTP has been disabled successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async listSessions(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const data = await userService.listUserSessions(userId, req.authSessionId);
            return res.status(200).json({
                success: true,
                message: "Sessions fetched successfully",
                data
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async logoutCurrentSession(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            await userService.revokeCurrentSession(userId, req.authSessionId);
            return res.status(200).json({
                success: true,
                message: "Current session revoked successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async revokeSession(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            await userService.revokeSessionById(
                userId,
                req.params.sessionId,
                req.authSessionId
            );
            return res.status(200).json({
                success: true,
                message: "Session revoked successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async revokeOtherSessions(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            await userService.revokeOtherSessions(userId, req.authSessionId);
            return res.status(200).json({
                success: true,
                message: "Other sessions revoked successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async listFriendOverview(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const parsedQuery = FriendOverviewQueryDto.safeParse(req.query);
            if (!parsedQuery.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedQuery.error),
                });
            }

            const data = await userService.listFriendOverview(userId, parsedQuery.data);
            return res.status(200).json({
                success: true,
                message: "Friend overview fetched successfully",
                data,
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async sendFriendRequest(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const parsedBody = SendFriendRequestDto.safeParse(req.body);
            if (!parsedBody.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedBody.error),
                });
            }

            await userService.sendFriendRequest(userId, parsedBody.data, getClientIp(req));
            return res.status(200).json({
                success: true,
                message: "If that account accepts requests, your friend request has been processed.",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async acceptFriendRequest(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const parsedParams = FriendRequestParamsDto.safeParse(req.params);
            if (!parsedParams.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedParams.error),
                });
            }

            await userService.acceptFriendRequest(
                userId,
                parsedParams.data.requestId,
                getClientIp(req)
            );
            return res.status(200).json({
                success: true,
                message: "Friend request accepted successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async rejectFriendRequest(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const parsedParams = FriendRequestParamsDto.safeParse(req.params);
            if (!parsedParams.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedParams.error),
                });
            }

            await userService.rejectFriendRequest(
                userId,
                parsedParams.data.requestId,
                getClientIp(req)
            );
            return res.status(200).json({
                success: true,
                message: "Friend request rejected successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async cancelFriendRequest(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const parsedParams = FriendRequestParamsDto.safeParse(req.params);
            if (!parsedParams.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedParams.error),
                });
            }

            await userService.cancelFriendRequest(
                userId,
                parsedParams.data.requestId,
                getClientIp(req)
            );
            return res.status(200).json({
                success: true,
                message: "Friend request cancelled successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async removeFriend(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const parsedParams = RemoveFriendParamsDto.safeParse(req.params);
            if (!parsedParams.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedParams.error),
                });
            }

            await userService.removeFriend(userId, parsedParams.data.friendUserId);
            return res.status(200).json({
                success: true,
                message: "Friend removed successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async blockUser(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const parsedBody = BlockUserDto.safeParse(req.body);
            if (!parsedBody.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedBody.error),
                });
            }

            await userService.blockUser(userId, parsedBody.data.blockedUserId, getClientIp(req));
            return res.status(200).json({
                success: true,
                message: "User blocked successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async unblockUser(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const parsedParams = UnblockUserParamsDto.safeParse(req.params);
            if (!parsedParams.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedParams.error),
                });
            }

            await userService.unblockUser(userId, parsedParams.data.blockedUserId, getClientIp(req));
            return res.status(200).json({
                success: true,
                message: "User unblocked successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async reportFriendRequest(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const parsedParams = FriendRequestParamsDto.safeParse(req.params);
            if (!parsedParams.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedParams.error),
                });
            }

            const parsedBody = CreateFriendRequestReportDto.safeParse(req.body);
            if (!parsedBody.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedBody.error),
                });
            }

            const report = await userService.reportFriendRequest(
                userId,
                parsedParams.data.requestId,
                parsedBody.data,
                getClientIp(req)
            );

            return res.status(201).json({
                success: true,
                message: "Friend request reported successfully",
                data: report,
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }
}

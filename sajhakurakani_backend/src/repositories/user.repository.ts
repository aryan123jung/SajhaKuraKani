import { QueryFilter } from "mongoose";
import { IUser, UserModel } from "../models/user.model";

const SENSITIVE_USER_SELECT =
    "+password +failedLoginAttempts +lockUntil +passwordChangedAt +resetPasswordTokenHash +resetPasswordExpiresAt +totpSecretEncrypted +totpTempSecretEncrypted +oauthSubject";

export interface IUserRepository{
    getUserByEmail(email: string, includeSensitive?: boolean): Promise<IUser | null>;
    getUserByUsername(username: string): Promise<IUser | null>;

    createUser(userData: Partial<IUser>): Promise<IUser>;
    getUserById(userId: string, includeSensitive?: boolean):Promise <IUser | null>;
    getUserByResetPasswordTokenHash(tokenHash: string): Promise<IUser | null>;
    getUserByOAuth(provider: "google", subject: string, includeSensitive?: boolean): Promise<IUser | null>;
    // getAllusers(): Promise<IUser[]>;
    getAllusers(
        page: number, size: number, search?: string
    ): Promise<{users: IUser[], total: number}>;
    searchUsersForUser(
        currentUserId: string,
        page: number,
        size: number,
        search?: string
    ): Promise<{ users: IUser[]; total: number }>;
    updateUser(userId: string, updatedDate: Partial<IUser>): Promise<IUser| null>;
    deleteUser(userId: string): Promise<boolean | null>;
}

export class UserRepository implements IUserRepository{
    getAllUsers(page: number, size: number, search?: string): Promise<{ users: IUser[]; total: number; }> {
        throw new Error("Method not implemented.");
    }
    async createUser(userData: Partial<IUser>): Promise<IUser> {
        const user = new UserModel(userData);
        await user.save();
        return user;
    }
    async getUserByEmail(email: string, includeSensitive = false): Promise<IUser | null> {
        let query = UserModel.findOne({"email" : email});
        if (includeSensitive) {
            query = query.select(SENSITIVE_USER_SELECT);
        }
        const user = await query;
        return user;
    }
    async getUserByUsername(username: string): Promise<IUser | null> {
        const user = await UserModel.findOne({"username": username});
        return user;
    }
    async getUserById(userId: string, includeSensitive = false): Promise<IUser | null> {
        let query = UserModel.findById(userId);
        if (includeSensitive) {
            query = query.select(SENSITIVE_USER_SELECT);
        }
        const user = await query;
        return user;
    }
    async getUserByResetPasswordTokenHash(tokenHash: string): Promise<IUser | null> {
        return UserModel.findOne({ resetPasswordTokenHash: tokenHash }).select(SENSITIVE_USER_SELECT);
    }
    async getUserByOAuth(provider: "google", subject: string, includeSensitive = false): Promise<IUser | null> {
        let query = UserModel.findOne({ oauthProvider: provider, oauthSubject: subject });
        if (includeSensitive) {
            query = query.select(SENSITIVE_USER_SELECT);
        }
        return query;
    }
    // async getAllusers(): Promise<IUser[]> {
    //     const users = await UserModel.find();
    //     return users;
    // }
    async getAllusers(
        page: number, size: number, search?: string
    ): Promise<{users: IUser[], total: number}> {
        const filter: QueryFilter<IUser> = {};
        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
            ];
        }
        const [users, total] = await Promise.all([
            UserModel.find(filter)
                .skip((page - 1) * size)
                .limit(size),
            UserModel.countDocuments(filter)
        ]);
        return { users, total };
    }
    async searchUsersForUser(
        currentUserId: string,
        page: number,
        size: number,
        search?: string
    ): Promise<{ users: IUser[]; total: number }> {
        const filter: QueryFilter<IUser> = {
            role: "user" as any
        };

        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: "i" } },
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        const [users, total] = await Promise.all([
            UserModel.find(filter)
                .select("-password")
                .skip((page - 1) * size)
                .limit(size),
            UserModel.countDocuments(filter)
        ]);

        return { users, total };
    }
    async updateUser(userId: string, updatedData: Partial<IUser>): Promise<IUser | null> {
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            updatedData,
            {new: true, runValidators: true}
        );
        return updatedUser;
    }
    async deleteUser(userId: string): Promise<boolean | null> {
        const result = await UserModel.findByIdAndDelete(userId);
        return result? true: false;
    }
 
}

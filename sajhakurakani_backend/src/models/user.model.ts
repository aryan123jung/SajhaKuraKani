import mongoose, { Document,Schema } from "mongoose";
import {UserType} from "../types/user.type.ts";

const userMongoSchema: Schema = new Schema(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ["user", "admin"], default: "user" },
        profileUrl: { type: String, required: false },
        coverUrl: { type: String, required: false },
    },
    {
        timestamps: true,
    }
);


export interface IUser extends UserType, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export const UserModel = mongoose.model<IUser>("User", userMongoSchema);

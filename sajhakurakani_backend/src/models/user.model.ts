import mongoose, { Document,Schema } from "mongoose";
import {UserType} from "../types/user.type.ts";

const userMongoSchema: Schema = new Schema(
    {
        fullname: {type:String, required: true},
        email: {type:String, required: true},
        username: {type:String, required: true,unique: true},
        password: {type: String, required: true},
        bio: {type: String, required: false, default: ""},
        profileUrl: {type: String, required: false}
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

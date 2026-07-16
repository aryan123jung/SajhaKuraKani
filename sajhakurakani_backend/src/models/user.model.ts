import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  role: "user" | "admin";
  profileUrl?: string;
  coverUrl?: string;
  totpEnabled: boolean;
  totpSecretEncrypted?: string;
  totpTempSecretEncrypted?: string;
  oauthProvider?: "google";
  oauthSubject?: string;
  failedLoginAttempts: number;
  lockUntil?: Date;
  passwordChangedAt?: Date;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  resetPasswordTokenHash?: string;
  resetPasswordExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userMongoSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    profileUrl: { type: String, required: false, trim: true, maxlength: 255 },
    coverUrl: { type: String, required: false, trim: true, maxlength: 255 },
    totpEnabled: { type: Boolean, default: false },
    totpSecretEncrypted: { type: String, select: false },
    totpTempSecretEncrypted: { type: String, select: false },
    oauthProvider: { type: String, enum: ["google"], required: false },
    oauthSubject: { type: String, required: false, index: true, sparse: true, select: false },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    passwordChangedAt: { type: Date, select: false },
    emailVerified: { type: Boolean, default: false, index: true },
    emailVerifiedAt: { type: Date, required: false },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpiresAt: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const sanitized = ret as Record<string, unknown>;
        delete sanitized.password;
        delete sanitized.failedLoginAttempts;
        delete sanitized.lockUntil;
        delete sanitized.passwordChangedAt;
        delete sanitized.totpSecretEncrypted;
        delete sanitized.totpTempSecretEncrypted;
        delete sanitized.oauthSubject;
        delete sanitized.resetPasswordTokenHash;
        delete sanitized.resetPasswordExpiresAt;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        const sanitized = ret as Record<string, unknown>;
        delete sanitized.password;
        delete sanitized.failedLoginAttempts;
        delete sanitized.lockUntil;
        delete sanitized.passwordChangedAt;
        delete sanitized.totpSecretEncrypted;
        delete sanitized.totpTempSecretEncrypted;
        delete sanitized.oauthSubject;
        delete sanitized.resetPasswordTokenHash;
        delete sanitized.resetPasswordExpiresAt;
        return ret;
      },
    },
  }
);

export const UserModel = mongoose.model<IUser>("User", userMongoSchema);

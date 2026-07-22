import mongoose, { Document, Schema } from "mongoose";

export interface IAdminActionConfirmation extends Document {
  _id: mongoose.Types.ObjectId;
  adminUserId: mongoose.Types.ObjectId;
  action: string;
  targetType: "user" | "post" | "comment";
  targetId: string;
  payloadHash: string;
  reason: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adminActionConfirmationSchema = new Schema<IAdminActionConfirmation>(
  {
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["user", "post", "comment"],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
    },
    payloadHash: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 280,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

adminActionConfirmationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminActionConfirmationModel = mongoose.model<IAdminActionConfirmation>(
  "AdminActionConfirmation",
  adminActionConfirmationSchema
);

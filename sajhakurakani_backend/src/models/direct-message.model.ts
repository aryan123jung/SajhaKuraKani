import mongoose, { Document, Schema } from "mongoose";

export interface IDirectMessage extends Document {
  _id: mongoose.Types.ObjectId;
  pairKey: string;
  participants: mongoose.Types.ObjectId[];
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  contentEncrypted: string;
  contentHash: string;
  duplicateFingerprint: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const directMessageMongoSchema = new Schema<IDirectMessage>(
  {
    pairKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
      validate: {
        validator: (value: mongoose.Types.ObjectId[]) => value.length === 2,
        message: "A direct message must have exactly two participants",
      },
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contentEncrypted: {
      type: String,
      required: true,
      select: false,
    },
    contentHash: {
      type: String,
      required: true,
      select: false,
    },
    duplicateFingerprint: {
      type: String,
      required: true,
      select: false,
      index: true,
    },
    readAt: {
      type: Date,
      required: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

directMessageMongoSchema.index({ pairKey: 1, createdAt: -1 });
directMessageMongoSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
directMessageMongoSchema.index({ sender: 1, pairKey: 1, createdAt: -1 });

export const DirectMessageModel = mongoose.model<IDirectMessage>(
  "DirectMessage",
  directMessageMongoSchema
);

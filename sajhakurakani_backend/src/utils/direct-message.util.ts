import { createHash } from "crypto";
import { decryptProtectedText, encryptProtectedText } from "./post-data-protection.util";
import { IDirectMessage } from "../models/direct-message.model";

export const createMessageContentHash = (content: string) =>
  createHash("sha256").update(content.trim()).digest("hex");

export const createMessageDuplicateFingerprint = (content: string) =>
  createHash("sha256").update(content.trim().toLowerCase()).digest("hex");

export const serializeMessageForResponse = <T extends IDirectMessage>(message: T) => {
  const serializedMessage = message.toObject ? message.toObject() : { ...message };

  return {
    ...serializedMessage,
    content: decryptProtectedText(message.contentEncrypted),
    contentEncrypted: undefined,
    contentHash: undefined,
    duplicateFingerprint: undefined,
  };
};

export const encryptMessageContent = (content: string) => encryptProtectedText(content);

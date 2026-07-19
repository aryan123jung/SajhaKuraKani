import { createHash } from "crypto";

export const createCommentContentHash = (content?: string) =>
  createHash("sha256").update((content ?? "").trim()).digest("hex");

export const createCommentDuplicateFingerprint = (content?: string) =>
  createHash("sha256")
    .update((content ?? "").trim().toLowerCase())
    .digest("hex");

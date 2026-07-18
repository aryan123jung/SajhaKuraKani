import fs from "fs";
import { createHash } from "crypto";

type PostAuditAction = "post.create" | "post.update" | "post.delete";

interface PostAuditLogInput {
  action: PostAuditAction;
  postId?: string;
  userId: string;
  ipAddress: string;
  userAgent?: string;
  visibility?: string;
  mediaCount?: number;
  contentHash: string;
}

interface CreatePostAuditHashInput {
  title?: string;
  content?: string;
  visibility?: string;
  files?: Express.Multer.File[];
}

export const createPostContentHash = ({
  title,
  content,
  visibility,
  files = [],
}: CreatePostAuditHashInput) => {
  const hash = createHash("sha256");

  hash.update(title ?? "");
  hash.update(content ?? "");
  hash.update(visibility ?? "");

  for (const file of files) {
    hash.update(file.originalname);
    hash.update(file.mimetype);
    hash.update(String(file.size));
    hash.update(fs.readFileSync(file.path));
  }

  return hash.digest("hex");
};

export const logPostAuditEvent = ({
  action,
  postId,
  userId,
  ipAddress,
  userAgent,
  visibility,
  mediaCount,
  contentHash,
}: PostAuditLogInput) => {
  console.info(
    JSON.stringify({
      scope: "post-audit",
      action,
      postId,
      userId,
      ipAddress,
      userAgent,
      visibility,
      mediaCount,
      contentHash,
      timestamp: new Date().toISOString(),
    })
  );
};


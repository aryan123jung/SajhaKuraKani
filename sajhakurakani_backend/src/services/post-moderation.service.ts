import { HttpError } from "../errors/http-error";
import {
  POST_CONTENT_BLOCKLIST,
  POST_CONTENT_MODERATION_ENABLED,
} from "../configs";

export const moderatePostContent = (title?: string, content?: string) => {
  if (!POST_CONTENT_MODERATION_ENABLED || POST_CONTENT_BLOCKLIST.length === 0) {
    return;
  }

  const normalizedText = `${title ?? ""}\n${content ?? ""}`.toLowerCase();
  const matchedBlockedTerm = POST_CONTENT_BLOCKLIST.find((blockedTerm) =>
    normalizedText.includes(blockedTerm)
  );

  if (matchedBlockedTerm) {
    // content moderation pipeline
    throw new HttpError(400, "Post content violates the platform safety policy");
  }
};


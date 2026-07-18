import { HttpError } from "../errors/http-error";
import {
  POST_CONTENT_BLOCKLIST,
  POST_HATE_SPEECH_BLOCKLIST,
  POST_CONTENT_MODERATION_ENABLED,
  POST_NSFW_BLOCKLIST,
  POST_PROFANITY_BLOCKLIST,
} from "../configs";

export const moderatePostContent = (title?: string, content?: string) => {
  if (!POST_CONTENT_MODERATION_ENABLED) {
    return;
  }

  const normalizedText = `${title ?? ""}\n${content ?? ""}`.toLowerCase();

  const moderationSets = [
    { label: "profanity", terms: POST_PROFANITY_BLOCKLIST },
    { label: "hate speech", terms: POST_HATE_SPEECH_BLOCKLIST },
    { label: "nsfw", terms: POST_NSFW_BLOCKLIST },
    { label: "unsafe content", terms: POST_CONTENT_BLOCKLIST },
  ];

  const matchedCategory = moderationSets.find((moderationSet) =>
    moderationSet.terms.some((blockedTerm) => normalizedText.includes(blockedTerm))
  );

  if (matchedCategory) {
    // content moderation pipeline
    throw new HttpError(400, "Post content violates the platform safety policy");
  }
};

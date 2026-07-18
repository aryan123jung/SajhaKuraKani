process.env.POST_DATA_ENCRYPTION_KEY =
  process.env.POST_DATA_ENCRYPTION_KEY ||
  "test-post-encryption-key-that-is-long-enough-123456";
process.env.POST_CONTENT_MODERATION_ENABLED =
  process.env.POST_CONTENT_MODERATION_ENABLED || "true";

jest.clearAllMocks();

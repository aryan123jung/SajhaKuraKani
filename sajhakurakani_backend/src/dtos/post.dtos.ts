import z from "zod";

const normalizeOptionalText = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const CreatePostDto = z.object({
  title: z.preprocess(
    normalizeOptionalText,
    z.string().trim().max(140).optional()
  ),
  content: z.preprocess(
    normalizeOptionalText,
    z.string().trim().max(5000).optional()
  ),
  visibility: z.enum(["public", "private", "friends-only"]).default("public"),
  commentPrivacy: z.enum(["everyone", "friends-only", "no-one"]).default("everyone"),
  sharePrivacy: z.enum(["everyone", "friends-only", "no-one"]).default("everyone"),
});

export const ListPostsQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(50).default(10),
});

export const UpdatePostDto = z
  .object({
    title: z.preprocess(
      normalizeOptionalText,
      z.string().trim().max(140).optional()
    ),
    content: z.preprocess(
      normalizeOptionalText,
      z.string().trim().max(5000).optional()
    ),
    visibility: z.enum(["public", "private", "friends-only"]).optional(),
    commentPrivacy: z.enum(["everyone", "friends-only", "no-one"]).optional(),
    sharePrivacy: z.enum(["everyone", "friends-only", "no-one"]).optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.content !== undefined ||
      value.visibility !== undefined ||
      value.commentPrivacy !== undefined ||
      value.sharePrivacy !== undefined,
    {
      message: "At least one field must be provided for update",
    }
  );

export const CreatePostReportDto = z.object({
  reason: z.enum([
    "spam",
    "hate-speech",
    "harassment",
    "nsfw",
    "misinformation",
    "self-harm",
    "other",
  ]),
  details: z.preprocess(
    normalizeOptionalText,
    z.string().trim().max(500).optional()
  ),
});

export type CreatePostInput = z.infer<typeof CreatePostDto>;
export type ListPostsQueryInput = z.infer<typeof ListPostsQueryDto>;
export type UpdatePostInput = z.infer<typeof UpdatePostDto>;

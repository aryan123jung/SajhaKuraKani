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

export const PostIdParamsDto = z.object({
  postId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid post identifier"),
});

export const PostAuthorParamsDto = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user identifier"),
});

export const PostMediaParamsDto = z.object({
  kind: z.enum(["images", "videos"]),
  filename: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/, "Invalid media filename"),
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
export type PostIdParamsInput = z.infer<typeof PostIdParamsDto>;
export type PostAuthorParamsInput = z.infer<typeof PostAuthorParamsDto>;
export type PostMediaParamsInput = z.infer<typeof PostMediaParamsDto>;

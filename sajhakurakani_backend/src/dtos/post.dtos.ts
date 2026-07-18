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
  visibility: z.enum(["public", "private"]).default("public"),
});

export const ListPostsQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreatePostInput = z.infer<typeof CreatePostDto>;
export type ListPostsQueryInput = z.infer<typeof ListPostsQueryDto>;

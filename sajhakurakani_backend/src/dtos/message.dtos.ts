import z from "zod";
import { MESSAGE_MAX_LENGTH } from "../configs";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");

const normalizeOptionalSearch = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const ListMessagesQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListMessagesQueryDto = z.infer<typeof ListMessagesQueryDto>;

export const ListConversationsQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(50).default(20),
  search: z.preprocess(
    normalizeOptionalSearch,
    z.string().trim().max(80).optional()
  ),
});
export type ListConversationsQueryDto = z.infer<typeof ListConversationsQueryDto>;

export const ConversationUserParamsDto = z.object({
  friendUserId: objectIdSchema,
});
export type ConversationUserParamsDto = z.infer<typeof ConversationUserParamsDto>;

export const SendDirectMessageDto = z.object({
  content: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
});
export type SendDirectMessageDto = z.infer<typeof SendDirectMessageDto>;

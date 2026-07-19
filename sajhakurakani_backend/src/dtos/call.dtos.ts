import z from "zod";
import { ACTIVE_CALL_STATUSES, FINAL_CALL_STATUSES } from "../models/call-session.model";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const CALL_STATUS_VALUES = [...ACTIVE_CALL_STATUSES, ...FINAL_CALL_STATUSES] as const;

const normalizeOptionalStatus = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const InitiateCallDto = z.object({
  calleeUserId: objectIdSchema,
  callType: z.enum(["audio", "video"]),
});
export type InitiateCallDto = z.infer<typeof InitiateCallDto>;

export const CallParamsDto = z.object({
  callId: objectIdSchema,
});
export type CallParamsDto = z.infer<typeof CallParamsDto>;

export const ListCallHistoryQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(50).default(20),
  status: z.preprocess(
    normalizeOptionalStatus,
    z.enum(CALL_STATUS_VALUES).optional()
  ),
});
export type ListCallHistoryQueryDto = z.infer<typeof ListCallHistoryQueryDto>;

import { Router } from "express";
import {
  MESSAGE_LIST_RATE_LIMIT_MAX_REQUESTS,
  MESSAGE_LIST_RATE_LIMIT_WINDOW_MS,
  MESSAGE_READ_RATE_LIMIT_MAX_REQUESTS,
  MESSAGE_READ_RATE_LIMIT_WINDOW_MS,
  MESSAGE_SEND_HOURLY_RATE_LIMIT_MAX_REQUESTS,
  MESSAGE_SEND_HOURLY_RATE_LIMIT_WINDOW_MS,
  MESSAGE_SEND_RATE_LIMIT_MAX_REQUESTS,
  MESSAGE_SEND_RATE_LIMIT_WINDOW_MS,
} from "../configs";
import { MessageController } from "../controllers/message.controller";
import { authorizedMiddleware } from "../middleware/authorized.middleware";
import { createRateLimitMiddleware, getClientIp } from "../middleware/rate-limit.middleware";

const router = Router();
const messageController = new MessageController();

const messageListLimiter = createRateLimitMiddleware({
  keyPrefix: "message-list",
  windowMs: MESSAGE_LIST_RATE_LIMIT_WINDOW_MS,
  maxRequests: MESSAGE_LIST_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many message requests. Please try again later.",
  keyGenerator: (req) =>
    `${req.user?._id?.toString() ?? "anonymous"}:${getClientIp(req)}`,
});

const messageSendPerMinuteLimiter = createRateLimitMiddleware({
  keyPrefix: "message-send-minute",
  windowMs: MESSAGE_SEND_RATE_LIMIT_WINDOW_MS,
  maxRequests: MESSAGE_SEND_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many messages were sent. Please slow down and try again later.",
  keyGenerator: (req) =>
    `${req.user?._id?.toString() ?? "anonymous"}:${getClientIp(req)}`,
});

const messageSendPerHourLimiter = createRateLimitMiddleware({
  keyPrefix: "message-send-hour",
  windowMs: MESSAGE_SEND_HOURLY_RATE_LIMIT_WINDOW_MS,
  maxRequests: MESSAGE_SEND_HOURLY_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many messages were sent from this account. Please try again later.",
  keyGenerator: (req) => req.user?._id?.toString() ?? "anonymous",
});

const messageReadLimiter = createRateLimitMiddleware({
  keyPrefix: "message-read",
  windowMs: MESSAGE_READ_RATE_LIMIT_WINDOW_MS,
  maxRequests: MESSAGE_READ_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many message status requests. Please try again later.",
  keyGenerator: (req) =>
    `${req.user?._id?.toString() ?? "anonymous"}:${getClientIp(req)}`,
});

router.get(
  "/conversations",
  authorizedMiddleware,
  messageListLimiter,
  messageController.listConversations
);
router.get(
  "/conversations/:friendUserId",
  authorizedMiddleware,
  messageListLimiter,
  messageController.listMessages
);
router.post(
  "/conversations/:friendUserId",
  authorizedMiddleware,
  messageSendPerMinuteLimiter,
  messageSendPerHourLimiter,
  messageController.sendMessage
);
router.post(
  "/conversations/:friendUserId/read",
  authorizedMiddleware,
  messageReadLimiter,
  messageController.markConversationRead
);

export default router;

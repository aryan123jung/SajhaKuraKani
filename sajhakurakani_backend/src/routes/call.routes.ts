import { Router } from "express";
import {
  CALL_ACTION_RATE_LIMIT_MAX_REQUESTS,
  CALL_ACTION_RATE_LIMIT_WINDOW_MS,
  CALL_HISTORY_RATE_LIMIT_MAX_REQUESTS,
  CALL_HISTORY_RATE_LIMIT_WINDOW_MS,
  CALL_INITIATE_RATE_LIMIT_MAX_REQUESTS,
  CALL_INITIATE_RATE_LIMIT_WINDOW_MS,
} from "../configs";
import { CallController } from "../controllers/call.controller";
import { authorizedMiddleware } from "../middleware/authorized.middleware";
import { createRateLimitMiddleware, getClientIp } from "../middleware/rate-limit.middleware";

const router = Router();
const callController = new CallController();

const callInitiateLimiter = createRateLimitMiddleware({
  keyPrefix: "call-initiate",
  windowMs: CALL_INITIATE_RATE_LIMIT_WINDOW_MS,
  maxRequests: CALL_INITIATE_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many call attempts were made. Please wait a bit and try again.",
  keyGenerator: (req) =>
    `${req.user?._id?.toString() ?? "anonymous"}:${getClientIp(req)}`,
});

const callActionLimiter = createRateLimitMiddleware({
  keyPrefix: "call-action",
  windowMs: CALL_ACTION_RATE_LIMIT_WINDOW_MS,
  maxRequests: CALL_ACTION_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many call actions were made. Please try again later.",
  keyGenerator: (req) =>
    `${req.user?._id?.toString() ?? "anonymous"}:${getClientIp(req)}`,
});

const callHistoryLimiter = createRateLimitMiddleware({
  keyPrefix: "call-history",
  windowMs: CALL_HISTORY_RATE_LIMIT_WINDOW_MS,
  maxRequests: CALL_HISTORY_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many call history requests. Please try again later.",
  keyGenerator: (req) =>
    `${req.user?._id?.toString() ?? "anonymous"}:${getClientIp(req)}`,
});

router.get("/active", authorizedMiddleware, callHistoryLimiter, callController.getActiveCall);
router.get("/history", authorizedMiddleware, callHistoryLimiter, callController.listHistory);
router.post(
  "/initiate",
  authorizedMiddleware,
  callInitiateLimiter,
  callController.initiateCall
);
router.post("/:callId/accept", authorizedMiddleware, callActionLimiter, callController.acceptCall);
router.post("/:callId/decline", authorizedMiddleware, callActionLimiter, callController.declineCall);
router.post("/:callId/end", authorizedMiddleware, callActionLimiter, callController.endCall);

export default router;

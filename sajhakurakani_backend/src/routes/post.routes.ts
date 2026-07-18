import { Router } from "express";
import { PostController } from "../controllers/post.controller";
import { PostReportController } from "../controllers/post-report.controller";
import { authorizedMiddleware } from "../middleware/authorized.middleware";
import { createRateLimitMiddleware, getClientIp } from "../middleware/rate-limit.middleware";
import { validateUploadedPostFiles } from "../middleware/post-upload-security.middleware";
import { uploads } from "../middleware/upload.middleware";
import {
  POST_DELETE_RATE_LIMIT_MAX_REQUESTS,
  POST_MEDIA_RATE_LIMIT_MAX_REQUESTS,
  POST_READ_RATE_LIMIT_MAX_REQUESTS,
  POST_READ_RATE_LIMIT_WINDOW_MS,
  POST_REPORT_RATE_LIMIT_MAX_REQUESTS,
  POST_UPDATE_RATE_LIMIT_MAX_REQUESTS,
  POST_WRITE_RATE_LIMIT_MAX_REQUESTS,
  POST_WRITE_RATE_LIMIT_WINDOW_MS,
} from "../configs";

const router = Router();
const postController = new PostController();
const postReportController = new PostReportController();

const postWriteLimiter = createRateLimitMiddleware({
  keyPrefix: "post-write",
  windowMs: POST_WRITE_RATE_LIMIT_WINDOW_MS,
  maxRequests: POST_WRITE_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many post creation attempts. Please try again later.",
  keyGenerator: (req) => `${req.user?._id?.toString() ?? "anonymous"}:${getClientIp(req)}`,
});

const postUpdateLimiter = createRateLimitMiddleware({
  keyPrefix: "post-update",
  windowMs: POST_WRITE_RATE_LIMIT_WINDOW_MS,
  maxRequests: POST_UPDATE_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many post update attempts. Please try again later.",
  keyGenerator: (req) =>
    `${req.user?._id?.toString() ?? "anonymous"}:${getClientIp(req)}:${req.params.postId ?? "unknown"}`,
});

const postDeleteLimiter = createRateLimitMiddleware({
  keyPrefix: "post-delete",
  windowMs: POST_WRITE_RATE_LIMIT_WINDOW_MS,
  maxRequests: POST_DELETE_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many post delete attempts. Please try again later.",
  keyGenerator: (req) =>
    `${req.user?._id?.toString() ?? "anonymous"}:${getClientIp(req)}`,
});

const postReadLimiter = createRateLimitMiddleware({
  keyPrefix: "post-read",
  windowMs: POST_READ_RATE_LIMIT_WINDOW_MS,
  maxRequests: POST_READ_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many post requests. Please try again later.",
  keyGenerator: (req) =>
    `${req.user?._id?.toString() ?? "anonymous"}:${getClientIp(req)}`,
});

const postMediaLimiter = createRateLimitMiddleware({
  keyPrefix: "post-media",
  windowMs: POST_READ_RATE_LIMIT_WINDOW_MS,
  maxRequests: POST_MEDIA_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many media requests. Please try again later.",
  keyGenerator: (req) =>
    `${req.user?._id?.toString() ?? "anonymous"}:${getClientIp(req)}:${req.params.filename ?? "unknown"}`,
});

const postReportLimiter = createRateLimitMiddleware({
  keyPrefix: "post-report",
  windowMs: 15 * 60 * 1000,
  maxRequests: POST_REPORT_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many post report attempts. Please try again later.",
  keyGenerator: (req) =>
    `${req.user?._id?.toString() ?? "anonymous"}:${getClientIp(req)}:${req.params.postId ?? "unknown"}`,
});

router.post(
  "/",
  authorizedMiddleware,
  postWriteLimiter,
  uploads.fields([{ name: "media", maxCount: 4 }]),
  validateUploadedPostFiles,
  postController.createPost
);
router.get("/me", authorizedMiddleware, postReadLimiter, postController.getCurrentUserPosts);
router.delete("/me/all", authorizedMiddleware, postDeleteLimiter, postController.deleteAllMyPosts);
router.get("/user/:userId", authorizedMiddleware, postReadLimiter, postController.getUserPosts);
router.get("/reports/me", authorizedMiddleware, postReadLimiter, postReportController.getMyReports);
router.get(
  "/media/:kind/:filename",
  authorizedMiddleware,
  postMediaLimiter,
  postController.getPostMedia
);
router.post(
  "/:postId/report",
  authorizedMiddleware,
  postReportLimiter,
  postReportController.createReport
);
router.get("/:postId", authorizedMiddleware, postReadLimiter, postController.getPostById);
router.patch("/:postId", authorizedMiddleware, postUpdateLimiter, postController.updatePost);
router.delete("/:postId", authorizedMiddleware, postDeleteLimiter, postController.deletePost);

export default router;

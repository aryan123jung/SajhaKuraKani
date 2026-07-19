import { Router } from "express";
import { PostController } from "../controllers/post.controller";
import { PostInteractionController } from "../controllers/post-interaction.controller";
import { PostReportController } from "../controllers/post-report.controller";
import { authorizedMiddleware } from "../middleware/authorized.middleware";
import { createRateLimitMiddleware, getClientIp } from "../middleware/rate-limit.middleware";
import { validateUploadedPostFiles } from "../middleware/post-upload-security.middleware";
import { uploads } from "../middleware/upload.middleware";
import {
  COMMENT_DELETE_RATE_LIMIT_MAX_REQUESTS,
  COMMENT_DELETE_RATE_LIMIT_WINDOW_MS,
  COMMENT_REPORT_RATE_LIMIT_MAX_REQUESTS,
  COMMENT_REPORT_RATE_LIMIT_WINDOW_MS,
  COMMENT_WRITE_HOURLY_RATE_LIMIT_MAX_REQUESTS,
  COMMENT_WRITE_HOURLY_RATE_LIMIT_WINDOW_MS,
  COMMENT_WRITE_RATE_LIMIT_MAX_REQUESTS,
  COMMENT_WRITE_RATE_LIMIT_WINDOW_MS,
  LIKE_RATE_LIMIT_MAX_REQUESTS,
  LIKE_RATE_LIMIT_WINDOW_MS,
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
const postInteractionController = new PostInteractionController();

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

const commentWritePerMinuteLimiter = createRateLimitMiddleware({
  keyPrefix: "comment-write-minute",
  windowMs: COMMENT_WRITE_RATE_LIMIT_WINDOW_MS,
  maxRequests: COMMENT_WRITE_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many comments were posted. Please slow down and try again later.",
  keyGenerator: (req) => req.user?._id?.toString() ?? "anonymous",
});

const commentWritePerHourLimiter = createRateLimitMiddleware({
  keyPrefix: "comment-write-hour",
  windowMs: COMMENT_WRITE_HOURLY_RATE_LIMIT_WINDOW_MS,
  maxRequests: COMMENT_WRITE_HOURLY_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many comments were posted from this account. Please try again later.",
  keyGenerator: (req) => req.user?._id?.toString() ?? "anonymous",
});

const commentDeleteLimiter = createRateLimitMiddleware({
  keyPrefix: "comment-delete",
  windowMs: COMMENT_DELETE_RATE_LIMIT_WINDOW_MS,
  maxRequests: COMMENT_DELETE_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many comment deletions were made. Please try again later.",
  keyGenerator: (req) =>
    `${req.user?._id?.toString() ?? "anonymous"}:${req.params.commentId ?? "unknown"}`,
});

const commentReportLimiter = createRateLimitMiddleware({
  keyPrefix: "comment-report",
  windowMs: COMMENT_REPORT_RATE_LIMIT_WINDOW_MS,
  maxRequests: COMMENT_REPORT_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many comment report attempts. Please try again later.",
  keyGenerator: (req) =>
    `${req.user?._id?.toString() ?? "anonymous"}:${req.params.commentId ?? "unknown"}`,
});

const likeLimiter = createRateLimitMiddleware({
  keyPrefix: "post-like",
  windowMs: LIKE_RATE_LIMIT_WINDOW_MS,
  maxRequests: LIKE_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many like actions were made. Please try again later.",
  keyGenerator: (req) => req.user?._id?.toString() ?? "anonymous",
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
  "/:postId/engagement",
  authorizedMiddleware,
  postReadLimiter,
  postInteractionController.getEngagementSummary
);
router.get(
  "/:postId/comments",
  authorizedMiddleware,
  postReadLimiter,
  postInteractionController.listComments
);
router.post(
  "/:postId/comments",
  authorizedMiddleware,
  commentWritePerMinuteLimiter,
  commentWritePerHourLimiter,
  postInteractionController.createComment
);
router.patch(
  "/comments/:commentId",
  authorizedMiddleware,
  commentWritePerMinuteLimiter,
  commentWritePerHourLimiter,
  postInteractionController.updateComment
);
router.delete(
  "/comments/:commentId",
  authorizedMiddleware,
  commentDeleteLimiter,
  postInteractionController.deleteComment
);
router.post(
  "/comments/:commentId/report",
  authorizedMiddleware,
  commentReportLimiter,
  postInteractionController.reportComment
);
router.post(
  "/:postId/likes",
  authorizedMiddleware,
  likeLimiter,
  postInteractionController.likePost
);
router.delete(
  "/:postId/likes",
  authorizedMiddleware,
  likeLimiter,
  postInteractionController.unlikePost
);
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

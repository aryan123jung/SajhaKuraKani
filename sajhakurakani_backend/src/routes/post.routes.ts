import { Router } from "express";
import { PostController } from "../controllers/post.controller";
import { PostReportController } from "../controllers/post-report.controller";
import { authorizedMiddleware } from "../middleware/authorized.middleware";
import { createRateLimitMiddleware, getClientIp } from "../middleware/rate-limit.middleware";
import { validateUploadedPostFiles } from "../middleware/post-upload-security.middleware";
import { uploads } from "../middleware/upload.middleware";
import { POST_REPORT_RATE_LIMIT_MAX_REQUESTS } from "../configs";

const router = Router();
const postController = new PostController();
const postReportController = new PostReportController();

const postWriteLimiter = createRateLimitMiddleware({
  keyPrefix: "post-write",
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: "Too many post creation attempts. Please try again later.",
  keyGenerator: (req) => `${req.user?._id?.toString() ?? "anonymous"}:${getClientIp(req)}`,
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
router.get("/me", authorizedMiddleware, postController.getCurrentUserPosts);
router.delete("/me/all", authorizedMiddleware, postController.deleteAllMyPosts);
router.get("/user/:userId", authorizedMiddleware, postController.getUserPosts);
router.get("/reports/me", authorizedMiddleware, postReportController.getMyReports);
router.get(
  "/media/:kind/:filename",
  authorizedMiddleware,
  postController.getPostMedia
);
router.post(
  "/:postId/report",
  authorizedMiddleware,
  postReportLimiter,
  postReportController.createReport
);
router.get("/:postId", authorizedMiddleware, postController.getPostById);
router.patch("/:postId", authorizedMiddleware, postController.updatePost);
router.delete("/:postId", authorizedMiddleware, postController.deletePost);

export default router;

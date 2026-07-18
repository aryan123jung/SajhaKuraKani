import { Router } from "express";
import { PostController } from "../controllers/post.controller";
import { authorizedMiddleware } from "../middleware/authorized.middleware";
import { createRateLimitMiddleware, getClientIp } from "../middleware/rate-limit.middleware";
import { validateUploadedPostFiles } from "../middleware/post-upload-security.middleware";
import { uploads } from "../middleware/upload.middleware";

const router = Router();
const postController = new PostController();

const postWriteLimiter = createRateLimitMiddleware({
  keyPrefix: "post-write",
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: "Too many post creation attempts. Please try again later.",
  keyGenerator: (req) => `${req.user?._id?.toString() ?? "anonymous"}:${getClientIp(req)}`,
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
router.get("/user/:userId", authorizedMiddleware, postController.getUserPosts);
router.get(
  "/media/:kind/:filename",
  authorizedMiddleware,
  postController.getPostMedia
);
router.get("/:postId", authorizedMiddleware, postController.getPostById);
router.patch("/:postId", authorizedMiddleware, postController.updatePost);
router.delete("/:postId", authorizedMiddleware, postController.deletePost);

export default router;

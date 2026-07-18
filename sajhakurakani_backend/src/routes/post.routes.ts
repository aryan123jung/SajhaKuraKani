import { Router } from "express";
import { PostController } from "../controllers/post.controller";
import { authorizedMiddleware } from "../middleware/authorized.middleware";
import { createRateLimitMiddleware, getClientIp } from "../middleware/rate-limit.middleware";
import { uploads } from "../middleware/upload.middleware";

const router = Router();
const postController = new PostController();

const postWriteLimiter = createRateLimitMiddleware({
  keyPrefix: "post-write",
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: "Too many post creation attempts. Please try again later.",
  keyGenerator: (req) => getClientIp(req),
});

router.post(
  "/",
  authorizedMiddleware,
  postWriteLimiter,
  uploads.fields([{ name: "media", maxCount: 4 }]),
  postController.createPost
);
router.get("/me", authorizedMiddleware, postController.getCurrentUserPosts);

export default router;

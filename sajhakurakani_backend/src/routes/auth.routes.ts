import { Router } from "express";
import {
    AUTH_RATE_LIMIT_MAX_REQUESTS,
    AUTH_RATE_LIMIT_WINDOW_MS,
    RESET_RATE_LIMIT_MAX_REQUESTS
} from "../configs";
import { AuthController } from "../controllers/auth.controller";
import { authorizedMiddleware } from "../middleware/authorized.middleware";
import { createRateLimitMiddleware } from "../middleware/rate-limit.middleware";
import { uploads } from "../middleware/upload.middleware";

let authController = new AuthController();

const router = Router();
const authLimiter = createRateLimitMiddleware({
    keyPrefix: "auth",
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    maxRequests: AUTH_RATE_LIMIT_MAX_REQUESTS,
    message: "Too many authentication attempts. Please try again later.",
});

const passwordResetLimiter = createRateLimitMiddleware({
    keyPrefix: "password-reset",
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    maxRequests: RESET_RATE_LIMIT_MAX_REQUESTS,
    message: "Too many password reset attempts. Please try again later.",
});

router.post("/register", authLimiter, authController.createUser)
router.post("/login", authLimiter, authController.loginUser)
router.post("/login/verify-totp", authLimiter, authController.verifyLoginTotp)
router.get("/oauth/google/url", authLimiter, authController.getGoogleOAuthUrl)
router.post("/oauth/google/exchange", authLimiter, authController.exchangeGoogleOAuthCode)
router.post("/oauth/google/verify-totp", authLimiter, authController.verifyGoogleOAuthTotp)

router.get("/whoami", authorizedMiddleware, authController.getUserById);
router.get("/users", authorizedMiddleware, authController.searchUsers);
router.get("/user/:id", authorizedMiddleware, authController.getCurrentUser);
router.post("/totp/setup", authorizedMiddleware, authController.setupTotp);
router.post("/totp/enable", authorizedMiddleware, authController.enableTotp);
router.post("/totp/disable", authorizedMiddleware, authController.disableTotp);

router.put(
    "/update-profile",
    authorizedMiddleware,
    // uploads.single("image"),
    uploads.fields([
        { name: "profileUrl", maxCount: 1 },
        { name: "coverUrl", maxCount: 1 }
    ]),
    authController.updateUser
);

router.post(
    "/send-reset-password-email",
    passwordResetLimiter,
    authController.requestPasswordChange
);
router.get("/reset-password/:token/validate", passwordResetLimiter, authController.validateResetPasswordToken);
router.post("/reset-password/:token", passwordResetLimiter, authController.resetPassword);

export default router;

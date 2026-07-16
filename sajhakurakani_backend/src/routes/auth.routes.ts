import { Router } from "express";
import {
    AUTH_RATE_LIMIT_MAX_REQUESTS,
    AUTH_RATE_LIMIT_WINDOW_MS,
    RESET_RATE_LIMIT_MAX_REQUESTS
} from "../configs";
import { AuthController } from "../controllers/auth.controller";
import { authorizedMiddleware } from "../middleware/authorized.middleware";
import { createRateLimitMiddleware, getClientIp } from "../middleware/rate-limit.middleware";
import { uploads } from "../middleware/upload.middleware";

let authController = new AuthController();

const router = Router();
const getScopedEmailKey = (emailValue: unknown) =>
    typeof emailValue === "string" && emailValue.trim().length > 0
        ? emailValue.trim().toLowerCase()
        : "anonymous";

const authLimiter = createRateLimitMiddleware({
    keyPrefix: "auth",
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    maxRequests: AUTH_RATE_LIMIT_MAX_REQUESTS,
    message: "Too many authentication attempts. Please try again later.",
    keyGenerator: (req) => {
        // rate limiting
        return `${getClientIp(req)}:${getScopedEmailKey(req.body?.email)}`;
    },
});

const passwordResetLimiter = createRateLimitMiddleware({
    keyPrefix: "password-reset",
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    maxRequests: RESET_RATE_LIMIT_MAX_REQUESTS,
    message: "Too many password reset attempts. Please try again later.",
    keyGenerator: (req) => {
        // rate limiting
        return `${getClientIp(req)}:${getScopedEmailKey(req.body?.email ?? req.query?.email)}`;
    },
});

const emailVerificationLimiter = createRateLimitMiddleware({
    keyPrefix: "email-verification",
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    maxRequests: RESET_RATE_LIMIT_MAX_REQUESTS,
    message: "Too many verification attempts. Please try again later.",
    keyGenerator: (req) => {
        // email verification
        return `${getClientIp(req)}:${getScopedEmailKey(req.body?.email ?? req.query?.email ?? req.params?.token)}`;
    },
});

const sessionLimiter = createRateLimitMiddleware({
    keyPrefix: "session",
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    maxRequests: AUTH_RATE_LIMIT_MAX_REQUESTS * 2,
    message: "Too many session requests. Please try again later.",
    keyGenerator: (req) => {
        // session management
        return getClientIp(req);
    },
});

router.post("/register", authLimiter, authController.createUser)
router.post("/login", authLimiter, authController.loginUser)
router.post("/login/verify-totp", authLimiter, authController.verifyLoginTotp)
router.post("/refresh", sessionLimiter, authController.refreshSession)
router.get("/oauth/google/url", authLimiter, authController.getGoogleOAuthUrl)
router.post("/oauth/google/exchange", authLimiter, authController.exchangeGoogleOAuthCode)
router.post("/oauth/google/verify-totp", authLimiter, authController.verifyGoogleOAuthTotp)
router.post(
    "/resend-verification-email",
    emailVerificationLimiter,
    authController.requestEmailVerification
)
router.get(
    "/verify-email/:token",
    emailVerificationLimiter,
    authController.verifyEmail
)

router.get("/whoami", authorizedMiddleware, authController.getUserById);
router.get("/sessions", authorizedMiddleware, authController.listSessions);
router.post("/sessions/logout-current", authorizedMiddleware, authController.logoutCurrentSession);
router.post("/sessions/revoke-others", authorizedMiddleware, authController.revokeOtherSessions);
router.delete("/sessions/:sessionId", authorizedMiddleware, authController.revokeSession);
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

import express from "express";
import { authorizedMiddleware } from "../../middleware/authorized.middleware";
import {
  requireAdminPermission,
  requireAdminRole,
  requireSensitiveAdminReauth,
} from "../../middleware/admin/admin-authorization.middleware";
import { adminNetworkIsolationMiddleware } from "../../middleware/admin/admin-network.middleware";
import { createRateLimitMiddleware } from "../../middleware/rate-limit.middleware";
import {
  ADMIN_ACTION_RATE_LIMIT_MAX_REQUESTS,
  ADMIN_ACTION_RATE_LIMIT_WINDOW_MS,
} from "../../configs";
import { AdminController } from "../../controllers/admin/admin.controller";

const router = express.Router();
const adminController = new AdminController();

const adminActionRateLimiter = createRateLimitMiddleware({
  keyPrefix: "admin:actions",
  windowMs: ADMIN_ACTION_RATE_LIMIT_WINDOW_MS,
  maxRequests: ADMIN_ACTION_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many admin actions were made. Please slow down and try again shortly.",
  keyGenerator: (req) => req.user?._id?.toString() || "anonymous",
});

// layer2 - authenticated admin entrypoint
router.use(authorizedMiddleware);
// layer1 - network isolation for protected admin traffic
router.use(adminNetworkIsolationMiddleware);
// layer5 - least privilege base gate for admin-only endpoints
router.use(requireAdminRole(["admin"]));

// layer2 - force admin re-auth token issuance before sensitive actions
router.post("/auth/re-auth", adminActionRateLimiter, adminController.reauthenticate.bind(adminController));

router.get("/reports", requireAdminPermission("reports.review"), adminController.listReports.bind(adminController));
router.get("/reports/:id", requireAdminPermission("reports.review"), adminController.getReport.bind(adminController));
router.post("/reports/:id/dismiss", adminActionRateLimiter, requireAdminPermission("reports.review"), adminController.dismissReport.bind(adminController));
router.post(
  "/reports/:id/action",
  // layer4 - rate limit admin operations to slow abuse or compromised accounts
  adminActionRateLimiter,
  // layer5 - permission-level separation inside admin surface
  requireAdminPermission("reports.action"),
  // layer2 - recent re-auth required for sensitive moderation actions
  requireSensitiveAdminReauth(),
  adminController.actionReport.bind(adminController)
);

router.get("/users", requireAdminPermission("users.read"), adminController.searchUsers.bind(adminController));
router.get("/posts", requireAdminPermission("content.delete"), adminController.listPosts.bind(adminController));
router.post(
  "/users/:id/suspend",
  adminActionRateLimiter,
  requireAdminPermission("users.suspend"),
  requireSensitiveAdminReauth(),
  adminController.suspendUser.bind(adminController)
);
router.post(
  "/users/:id/ban",
  adminActionRateLimiter,
  requireAdminPermission("users.ban"),
  adminController.initiateBanUser.bind(adminController)
);
router.post(
  "/users/:id/ban/confirm",
  adminActionRateLimiter,
  requireAdminPermission("users.ban"),
  requireSensitiveAdminReauth(),
  adminController.confirmBanUser.bind(adminController)
);
router.post(
  "/users/:id/unban",
  adminActionRateLimiter,
  requireAdminPermission("users.ban"),
  requireSensitiveAdminReauth(),
  adminController.unbanUser.bind(adminController)
);
router.delete(
  "/users/:id",
  adminActionRateLimiter,
  requireAdminPermission("users.delete"),
  requireSensitiveAdminReauth(),
  adminController.deleteUser.bind(adminController)
);
router.post(
  "/users/:id/revoke-sessions",
  adminActionRateLimiter,
  requireAdminPermission("users.ban"),
  requireSensitiveAdminReauth(),
  adminController.revokeUserSessions.bind(adminController)
);

router.post(
  "/posts/:id/hide",
  adminActionRateLimiter,
  requireAdminPermission("content.hide"),
  requireSensitiveAdminReauth(),
  adminController.hidePost.bind(adminController)
);
router.delete(
  "/posts/:id",
  adminActionRateLimiter,
  requireAdminPermission("content.delete"),
  requireSensitiveAdminReauth(),
  adminController.deletePost.bind(adminController)
);
router.post(
  "/comments/:id/hide",
  adminActionRateLimiter,
  requireAdminPermission("content.hide"),
  requireSensitiveAdminReauth(),
  adminController.hideComment.bind(adminController)
);
router.delete(
  "/comments/:id",
  adminActionRateLimiter,
  requireAdminPermission("content.delete"),
  requireSensitiveAdminReauth(),
  adminController.deleteComment.bind(adminController)
);

router.get("/audit-logs", requireAdminPermission("audit.read"), adminController.listAuditLogs.bind(adminController));
// layer3/layer4 - security visibility for suspicious admin events
router.get("/security/alerts", requireAdminPermission("audit.read"), adminController.listSecurityAlerts.bind(adminController));
router.get("/admin-activity", requireAdminPermission("reports.review"), adminController.listAdminActivity.bind(adminController));
router.get("/stats", requireAdminPermission("stats.read"), adminController.getStats.bind(adminController));
router.get("/health", requireAdminPermission("health.read"), adminController.getHealth.bind(adminController));

export default router;

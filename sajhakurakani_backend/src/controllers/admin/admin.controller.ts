import type { Request, Response } from "express";
import z from "zod";
import { AdminService } from "../../services/admin/admin.service";
import { getClientIp } from "../../middleware/rate-limit.middleware";

const adminService = new AdminService();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

const reportListQuerySchema = paginationSchema.extend({
  status: z.string().trim().optional(),
  type: z.enum(["post", "comment", "friend-request"]).optional(),
});

const adminUserQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
});

const adminPostQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(160).optional(),
});

const auditQuerySchema = paginationSchema.extend({
  adminUserId: z.string().trim().optional(),
  action: z.string().trim().optional(),
  result: z.enum(["success", "failure"]).optional(),
});

const reasonSchema = z.object({
  reason: z.string().trim().min(3).max(280),
  reauthToken: z.string().trim().optional(),
});

const reportActionSchema = reasonSchema.extend({
  actionType: z.enum(["warn", "suspend", "ban"]),
  durationHours: z.coerce.number().int().min(1).max(24 * 30).optional(),
});

const suspendSchema = reasonSchema.extend({
  durationHours: z.coerce.number().int().min(1).max(24 * 30).default(24),
});

const banConfirmSchema = reasonSchema.extend({
  confirmationId: z.string().trim().min(1),
});

const reauthSchema = z.object({
  password: z.string().min(1),
  totpCode: z.string().trim().min(6).max(8),
});

export class AdminController {
  async reauthenticate(req: Request, res: Response) {
    try {
      const parsed = reauthSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }

      const data = await adminService.reauthenticateAdmin(
        req.user!,
        parsed.data.password,
        parsed.data.totpCode,
        getClientIp(req)
      );

      return res.status(200).json({ success: true, message: "Admin re-authentication successful", data });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async listReports(req: Request, res: Response) {
    try {
      const parsed = reportListQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }

      const data = await adminService.listReports(req.user!, parsed.data);
      return res.status(200).json({ success: true, data, message: "Reports fetched successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async getReport(req: Request, res: Response) {
    try {
      const data = await adminService.getReport(req.user!, req.params.id, getClientIp(req));
      return res.status(200).json({ success: true, data, message: "Report fetched successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async dismissReport(req: Request, res: Response) {
    try {
      const parsed = reasonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      const data = await adminService.dismissReport(req.user!, req.params.id, parsed.data.reason, getClientIp(req));
      return res.status(200).json({ success: true, data, message: "Report dismissed successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async actionReport(req: Request, res: Response) {
    try {
      const parsed = reportActionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      const data = await adminService.actionReport(
        req.user!,
        req.params.id,
        parsed.data,
        getClientIp(req),
        typeof req.headers["x-admin-reauth-token"] === "string" ? req.headers["x-admin-reauth-token"] : parsed.data.reauthToken
      );
      return res.status(200).json({ success: true, data, message: "Report action completed successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async searchUsers(req: Request, res: Response) {
    try {
      const parsed = adminUserQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      const data = await adminService.searchUsers(req.user!, parsed.data);
      return res.status(200).json({ success: true, data, message: "Users fetched successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async listPosts(req: Request, res: Response) {
    try {
      const parsed = adminPostQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      const data = await adminService.listPosts(req.user!, parsed.data);
      return res.status(200).json({ success: true, data, message: "Posts fetched successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async suspendUser(req: Request, res: Response) {
    try {
      const parsed = suspendSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      const data = await adminService.suspendUser(
        req.user!,
        req.params.id,
        parsed.data.reason,
        parsed.data.durationHours,
        getClientIp(req),
        typeof req.headers["x-admin-reauth-token"] === "string" ? req.headers["x-admin-reauth-token"] : parsed.data.reauthToken
      );
      return res.status(200).json({ success: true, data, message: "User suspended successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async initiateBanUser(req: Request, res: Response) {
    try {
      const parsed = reasonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      const data = await adminService.initiateBanUser(req.user!, req.params.id, parsed.data.reason, getClientIp(req));
      return res.status(200).json({ success: true, data, message: "Ban confirmation started" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async confirmBanUser(req: Request, res: Response) {
    try {
      const parsed = banConfirmSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      const data = await adminService.confirmBanUser(
        req.user!,
        req.params.id,
        parsed.data.confirmationId,
        parsed.data.reason,
        getClientIp(req),
        typeof req.headers["x-admin-reauth-token"] === "string" ? req.headers["x-admin-reauth-token"] : parsed.data.reauthToken
      );
      return res.status(200).json({ success: true, data, message: "User banned successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async unbanUser(req: Request, res: Response) {
    try {
      const parsed = reasonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      const data = await adminService.unbanUser(
        req.user!,
        req.params.id,
        parsed.data.reason,
        getClientIp(req),
        typeof req.headers["x-admin-reauth-token"] === "string" ? req.headers["x-admin-reauth-token"] : parsed.data.reauthToken
      );
      return res.status(200).json({ success: true, data, message: "User unbanned successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const parsed = reasonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      await adminService.deleteUser(
        req.user!,
        req.params.id,
        parsed.data.reason,
        getClientIp(req),
        typeof req.headers["x-admin-reauth-token"] === "string" ? req.headers["x-admin-reauth-token"] : parsed.data.reauthToken
      );
      return res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async hidePost(req: Request, res: Response) {
    try {
      const parsed = reasonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      const data = await adminService.hidePost(
        req.user!,
        req.params.id,
        parsed.data.reason,
        getClientIp(req),
        typeof req.headers["x-admin-reauth-token"] === "string" ? req.headers["x-admin-reauth-token"] : parsed.data.reauthToken
      );
      return res.status(200).json({ success: true, data, message: "Post hidden successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async deletePost(req: Request, res: Response) {
    try {
      const parsed = reasonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      const data = await adminService.deletePost(
        req.user!,
        req.params.id,
        parsed.data.reason,
        getClientIp(req),
        typeof req.headers["x-admin-reauth-token"] === "string" ? req.headers["x-admin-reauth-token"] : parsed.data.reauthToken
      );
      return res.status(200).json({ success: true, data, message: "Post deleted successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async hideComment(req: Request, res: Response) {
    try {
      const parsed = reasonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      const data = await adminService.hideComment(
        req.user!,
        req.params.id,
        parsed.data.reason,
        getClientIp(req),
        typeof req.headers["x-admin-reauth-token"] === "string" ? req.headers["x-admin-reauth-token"] : parsed.data.reauthToken
      );
      return res.status(200).json({ success: true, data, message: "Comment hidden successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async deleteComment(req: Request, res: Response) {
    try {
      const parsed = reasonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      const data = await adminService.deleteComment(
        req.user!,
        req.params.id,
        parsed.data.reason,
        getClientIp(req),
        typeof req.headers["x-admin-reauth-token"] === "string" ? req.headers["x-admin-reauth-token"] : parsed.data.reauthToken
      );
      return res.status(200).json({ success: true, data, message: "Comment deleted successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async listAuditLogs(req: Request, res: Response) {
    try {
      const parsed = auditQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      const data = await adminService.listAuditLogs(req.user!, parsed.data);
      return res.status(200).json({ success: true, data, message: "Audit logs fetched successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async listAdminActivity(req: Request, res: Response) {
    try {
      const parsed = paginationSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      const data = await adminService.listAdminActivity(req.user!, parsed.data);
      return res.status(200).json({ success: true, data, message: "Admin activity fetched successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const data = await adminService.getStats(req.user!);
      return res.status(200).json({ success: true, data, message: "Admin stats fetched successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async getHealth(req: Request, res: Response) {
    try {
      const data = await adminService.getHealth(req.user!);
      return res.status(200).json({ success: true, data, message: "Admin health fetched successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async listSecurityAlerts(req: Request, res: Response) {
    try {
      const data = await adminService.listSecurityAlerts(req.user!);
      return res.status(200).json({ success: true, data, message: "Admin security alerts fetched successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }

  async revokeUserSessions(req: Request, res: Response) {
    try {
      const parsed = reasonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.prettifyError(parsed.error) });
      }
      await adminService.revokeUserSessions(
        req.user!,
        req.params.id,
        parsed.data.reason,
        getClientIp(req),
        typeof req.headers["x-admin-reauth-token"] === "string" ? req.headers["x-admin-reauth-token"] : parsed.data.reauthToken
      );
      return res.status(200).json({ success: true, message: "User sessions revoked successfully" });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
  }
}

import crypto from "crypto";
import type { Request } from "express";
import type { IUser } from "../models/user.model";
import { getClientIp } from "../middleware/rate-limit.middleware";
import { HttpError } from "../errors/http-error";
import { isAdminRole } from "./admin.constants";

export const assertAdminUser = (user?: IUser | null) => {
  if (!user || !isAdminRole(user.role)) {
    throw new HttpError(403, "Forbidden: admin access only");
  }

  if (user.isBanned) {
    throw new HttpError(403, "This admin account is disabled");
  }

  if (user.suspendedUntil && user.suspendedUntil.getTime() > Date.now()) {
    throw new HttpError(403, "This admin account is suspended");
  }
};

export const assertAdminTotpEnabled = (user: IUser) => {
  if (isAdminRole(user.role) && !user.totpEnabled) {
    throw new HttpError(
      403,
      "Admin accounts must enable two-factor authentication before signing in."
    );
  }
};

export const getAdminAuditIp = (req: Request) => getClientIp(req);

export const maskEmail = (email?: string) => {
  if (!email) {
    return undefined;
  }

  const [local, domain] = email.split("@");
  if (!domain) {
    return "***";
  }

  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
};

export const sanitizeAdminReason = (reason: string) => reason.trim().slice(0, 280);

export const hashConfirmationPayload = (payload: unknown) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

export const detectSuspiciousAdminBurst = async (
  recentActionCount: number,
  adminUserId: string,
  action: string
) => {
  if (recentActionCount >= 50) {
    console.warn(
      JSON.stringify({
        scope: "admin-security",
        alert: "suspicious_admin_activity",
        adminUserId,
        action,
        recentActionCount,
        timestamp: new Date().toISOString(),
      })
    );
  }
};

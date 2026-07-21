import { NextFunction, Request, Response } from "express";
import { HttpError } from "../../errors/http-error";
import { hasAdminPermission, isAdminRole, type AdminPermission, type AdminRole } from "../../admin/admin.constants";
import { assertAdminUser } from "../../admin/admin.helpers";

export const requireAdminRole =
  (roles: readonly AdminRole[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // layer5 - least privilege role gate
      assertAdminUser(req.user);

      if (!roles.includes(req.user!.role as AdminRole)) {
        throw new HttpError(403, "Forbidden: this admin role cannot access this endpoint");
      }

      return next();
    } catch (err: Error | any) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
      });
    }
  };

export const requireAdminPermission =
  (permission: AdminPermission) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // layer5 - permission-level guard inside admin space
      assertAdminUser(req.user);

      if (!hasAdminPermission(req.user!.role, permission)) {
        throw new HttpError(403, "Forbidden: insufficient admin permissions");
      }

      return next();
    } catch (err: Error | any) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
      });
    }
  };

export const requireSensitiveAdminReauth =
  () => (req: Request, res: Response, next: NextFunction) => {
    try {
      // layer2 - recent re-auth required before high-risk admin actions
      assertAdminUser(req.user);
      const reauthToken =
        (typeof req.headers["x-admin-reauth-token"] === "string"
          ? req.headers["x-admin-reauth-token"]
          : undefined) ||
        (typeof req.body?.reauthToken === "string" ? req.body.reauthToken : undefined);

      if (!reauthToken) {
        throw new HttpError(401, "Recent admin re-authentication is required for this action");
      }

      req.headers["x-admin-reauth-token"] = reauthToken;
      return next();
    } catch (err: Error | any) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
      });
    }
  };

export const isPrivilegedAdminRequest = (req: Request) =>
  isAdminRole(req.user?.role);

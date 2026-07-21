import mongoose from "mongoose";
import {
  AdminAuditLogModel,
  type AdminAuditAction,
  type IAdminAuditLog,
} from "../../models/admin/admin-audit-log.model";

export class AdminAuditRepository {
  async createAuditLog(data: Partial<IAdminAuditLog>) {
    const log = new AdminAuditLogModel(data);
    await log.save();
    return log;
  }

  async listAuditLogs(filter: Record<string, unknown>, limit: number, skip: number) {
    const [items, total] = await Promise.all([
      AdminAuditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AdminAuditLogModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async countRecentActions(adminUserId: string, since: Date) {
    return AdminAuditLogModel.countDocuments({
      adminUserId: new mongoose.Types.ObjectId(adminUserId),
      createdAt: { $gte: since },
      result: "success",
    });
  }

  async countRecentActionByType(
    adminUserId: string,
    action: AdminAuditAction,
    since: Date
  ) {
    return AdminAuditLogModel.countDocuments({
      adminUserId: new mongoose.Types.ObjectId(adminUserId),
      action,
      createdAt: { $gte: since },
      result: "success",
    });
  }
}

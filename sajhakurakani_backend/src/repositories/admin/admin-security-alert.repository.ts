import { AdminSecurityAlertModel, type IAdminSecurityAlert } from "../../models/admin/admin-security-alert.model";

export class AdminSecurityAlertRepository {
  async createAlert(data: Partial<IAdminSecurityAlert>) {
    const alert = new AdminSecurityAlertModel(data);
    await alert.save();
    console.warn(
      JSON.stringify({
        scope: "admin-security-alert",
        type: alert.type,
        severity: alert.severity,
        adminUserId: alert.adminUserId?.toString() ?? null,
        ipAddress: alert.ipAddress ?? null,
        timestamp: alert.createdAt.toISOString(),
      })
    );
    return alert;
  }

  async listAlerts(limit = 50) {
    return AdminSecurityAlertModel.find().sort({ createdAt: -1 }).limit(limit);
  }
}

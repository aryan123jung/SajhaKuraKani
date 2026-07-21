import { AdminActionConfirmationModel } from "../../models/admin/admin-action-confirmation.model";

export class AdminConfirmationRepository {
  async createConfirmation(data: ConstructorParameters<typeof AdminActionConfirmationModel>[0]) {
    const confirmation = new AdminActionConfirmationModel(data);
    await confirmation.save();
    return confirmation;
  }

  async getActiveConfirmation(id: string, adminUserId: string, action: string) {
    return AdminActionConfirmationModel.findOne({
      _id: id,
      adminUserId,
      action,
      expiresAt: { $gt: new Date() },
    });
  }
}

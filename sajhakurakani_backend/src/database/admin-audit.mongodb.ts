import mongoose from "mongoose";
import { ADMIN_AUDIT_DB_NAME } from "../configs";

let cachedAdminAuditDb: mongoose.Connection | null = null;

export const getAdminAuditDb = () => {
  if (cachedAdminAuditDb) {
    return cachedAdminAuditDb;
  }

  cachedAdminAuditDb = mongoose.connection.useDb(ADMIN_AUDIT_DB_NAME, {
    useCache: true,
  });

  return cachedAdminAuditDb;
};

export const getAdminAuditDbStatus = () => {
  const connection = getAdminAuditDb();
  return {
    name: connection.name,
    readyState: connection.readyState,
  };
};

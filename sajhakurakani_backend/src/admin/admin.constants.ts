export const ADMIN_ROLES = ["admin"] as const;
export const ALL_USER_ROLES = ["user", ...ADMIN_ROLES] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type UserRole = (typeof ALL_USER_ROLES)[number];

export type AdminPermission =
  | "reports.review"
  | "reports.action"
  | "users.read"
  | "users.suspend"
  | "users.ban"
  | "users.delete"
  | "content.hide"
  | "content.delete"
  | "audit.read"
  | "stats.read"
  | "health.read";

const PERMISSIONS_BY_ROLE: Record<AdminRole, readonly AdminPermission[]> = {
  admin: [
    "reports.review",
    "reports.action",
    "users.read",
    "users.suspend",
    "users.ban",
    "users.delete",
    "content.hide",
    "content.delete",
    "audit.read",
    "stats.read",
    "health.read",
  ],
};

export const isAdminRole = (role: string | undefined | null): role is AdminRole =>
  Boolean(role && ADMIN_ROLES.includes(role as AdminRole));

export const hasAdminPermission = (
  role: string | undefined | null,
  permission: AdminPermission
) => {
  if (!isAdminRole(role)) {
    return false;
  }

  return PERMISSIONS_BY_ROLE[role].includes(permission);
};

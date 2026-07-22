export const adminNavItems = [
  { href: "/admin", label: "Overview", shortLabel: "O", caption: "Stats, health, alerts" },
  { href: "/admin/reports", label: "Reports", shortLabel: "R", caption: "Review abuse cases" },
  { href: "/admin/users", label: "Users", shortLabel: "U", caption: "Suspend, ban, revoke" },
  { href: "/admin/posts", label: "Posts", shortLabel: "P", caption: "Browse and remove posts" },
  { href: "/admin/audit", label: "Audit", shortLabel: "A", caption: "Immutable activity trail" },
  { href: "/admin/security", label: "Security", shortLabel: "S", caption: "Alerts and exposure" },
] as const;

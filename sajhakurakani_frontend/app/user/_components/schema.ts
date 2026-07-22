export type UserNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  caption: string;
};

export const primaryNavItems: UserNavItem[] = [
  {
    href: "/user/home",
    label: "Home",
    shortLabel: "H",
    caption: "Overview",
  },
  {
    href: "/user/notifications",
    label: "Notifications",
    shortLabel: "N",
    caption: "Alerts",
  },
  {
    href: "/user/message",
    label: "Messages",
    shortLabel: "M",
    caption: "Inbox",
  },
  {
    href: "/user/friends",
    label: "Friends",
    shortLabel: "F",
    caption: "Connections",
  },
];

export const supportNavItems: UserNavItem[] = [
  {
    href: "/user/settings",
    label: "Settings",
    shortLabel: "S",
    caption: "Dark mode, 2FA",
  },
];

export const sectionTitles: Record<string, string> = {
  "/user/home": "Home",
  "/user/notifications": "Notifications",
  "/user/message": "Messages",
  "/user/friends": "Friends",
  "/user/search": "Search",
  "/user/settings": "Settings",
};

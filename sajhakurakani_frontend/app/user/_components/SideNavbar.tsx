import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";
import type { AuthUser } from "@/lib/api/auth";
import { primaryNavItems, supportNavItems } from "./schema";

type SideNavbarProps = {
  currentPath: string;
  csrfToken: string;
  user: AuthUser | null;
  onNavigate?: () => void;
};

export default function SideNavbar({
  currentPath,
  csrfToken,
  user,
  onNavigate,
}: SideNavbarProps) {
  const fullName = user ? `${user.firstName} ${user.lastName}` : "Secure user";
  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
    : "SK";

  const renderNavLink = (href: string, label: string, shortLabel: string, caption: string) => {
    const isActive = currentPath === href;

    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        className={`group flex items-center gap-3 rounded-[18px] px-3 py-2.5 transition ${
          isActive
            ? "bg-[#fff4ed] text-[#ef744b] shadow-[0_12px_24px_rgba(112,69,43,0.08)]"
            : "hover:bg-white/70"
          }`}
      >
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border text-xs font-semibold ${
            isActive
              ? "border-[#f4c4ab] bg-white text-[#ef744b]"
              : "border-[#eadcd2] bg-[#fffaf6] text-[#7c7580]"
          }`}
        >
          {shortLabel}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[#1d243f]">
            {label}
          </span>
          <span className="block text-[0.78rem] text-[#8e8a90]">{caption}</span>
        </span>
      </Link>
    );
  };

  return (
    <aside className="flex h-full min-h-full flex-col rounded-[20px] border border-[#edd9cf] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,247,241,0.95))] p-3.5 shadow-[0_16px_36px_rgba(130,87,58,0.1)]">
      <div className="flex items-center gap-2.5 rounded-[14px] bg-white/78 px-2.5 py-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[radial-gradient(circle_at_top,_rgba(255,163,111,0.28),_transparent_60%),linear-gradient(160deg,#1c2440_0%,#3f4f95_55%,#ff855a_100%)]">
          <Image
            src="/brand/logo.svg"
            alt="SajhaKuraKani"
            width={28}
            height={28}
            className="h-auto w-6"
            priority
          />
        </div>
        <div className="min-w-0">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#9d8b85]">
            Workspace
          </p>
          <h1 className="truncate text-[0.95rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
            SajhaKuraKani
          </h1>
        </div>
      </div>

      <div className="mt-3.5 flex items-center gap-2.5 rounded-[14px] border border-[#ecdcd2] bg-white/80 px-2.5 py-2.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d243f] text-xs font-semibold text-white">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[0.9rem] font-semibold text-[#1d243f]">{fullName}</p>
          <p className="truncate text-[0.72rem] text-[#7d7b83]">
            {user?.email ?? "Protected workspace"}
          </p>
        </div>
      </div>

      <nav className="mt-4 space-y-1">
        {primaryNavItems.map((item) =>
          renderNavLink(item.href, item.label, item.shortLabel, item.caption)
        )}
      </nav>

      <div className="mt-4 border-t border-[#efe2d8] pt-3.5">
        {supportNavItems.map((item) =>
          renderNavLink(item.href, item.label, item.shortLabel, item.caption)
        )}
      </div>

      <div className="mt-3.5 rounded-[14px] border border-[#ecdcd2] bg-[#fffaf6] px-2.5 py-2.5">
        <p className="text-[0.88rem] font-semibold text-[#1d243f]">Security</p>
        <p className="mt-1 text-[0.72rem] leading-5 text-[#7d7b83]">
          {user?.totpEnabled ? "2FA enabled" : "2FA available"} and dark mode controls live in settings.
        </p>
      </div>

      <form action={logoutAction} className="mt-auto pt-4">
        <input type="hidden" name="_csrf" value={csrfToken} />
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-[14px] bg-[#1d243f] px-4 py-2.5 text-[0.9rem] font-semibold text-white shadow-[0_10px_20px_rgba(29,36,63,0.12)] transition hover:bg-[#18203a]"
        >
          Log out
        </button>
      </form>
    </aside>
  );
}

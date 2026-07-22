"use client";

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

  return (
    <aside className="flex h-full flex-col border-r border-[#ead6ca] bg-white/96 p-4 shadow-[10px_0_28px_rgba(88,57,38,0.08)] backdrop-blur">
      <Link
        href="/user/profile"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-[18px] border border-[#efe2d9] bg-[#fffaf6] p-3 transition hover:bg-white"
      >
        <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-sm font-semibold text-white">
          {user?.profileUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.profileUrl}
              alt={fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[0.98rem] font-semibold text-[#1d243f]">
            {fullName}
          </p>
          <p className="truncate text-[0.78rem] text-[#7a7381]">
            {user?.email ?? "Protected account"}
          </p>
        </div>
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#efe2d9]" />
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#9a93a0]">
          Main Menu
        </span>
        <div className="h-px flex-1 bg-[#efe2d9]" />
      </div>

      <nav className="mt-4 space-y-2">
        {primaryNavItems.map((item) => {
          const isActive = currentPath === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-[16px] px-3.5 py-3 transition ${
                isActive
                  ? "bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] text-white shadow-[0_12px_24px_rgba(241,111,56,0.18)]"
                  : "border border-[#efe2d9] bg-[#fffaf6] text-[#526077] hover:bg-white"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive ? "bg-white/20 text-white" : "bg-[#f5ede8] text-[#1d243f]"
                }`}
              >
                {item.shortLabel}
              </span>
              <div className="min-w-0">
                <p className="text-[0.9rem] font-semibold">{item.label}</p>
                <p
                  className={`truncate text-[0.72rem] ${
                    isActive ? "text-white/80" : "text-[#8a8390]"
                  }`}
                >
                  {item.caption}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 space-y-2 border-t border-[#efe2d9] pt-4">
        {supportNavItems.map((item) => {
          const isActive = currentPath === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-[16px] px-3.5 py-3 transition ${
                isActive
                  ? "bg-[#1d243f] text-white shadow-[0_12px_24px_rgba(29,36,63,0.16)]"
                  : "border border-[#efe2d9] bg-[#fffaf6] text-[#526077] hover:bg-white"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive ? "bg-white/16 text-white" : "bg-[#f5ede8] text-[#1d243f]"
                }`}
              >
                {item.shortLabel}
              </span>
              <div className="min-w-0">
                <p className="text-[0.9rem] font-semibold">{item.label}</p>
                <p
                  className={`truncate text-[0.72rem] ${
                    isActive ? "text-white/74" : "text-[#8a8390]"
                  }`}
                >
                  {item.caption}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <form
        action={logoutAction}
        className="mt-auto pt-4"
        onSubmit={(event) => {
          if (!window.confirm("Are you sure you want to log out?")) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="_csrf" value={csrfToken} />
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-[16px] border border-[#efe2d9] bg-[#fff8f3] px-4 py-3 text-[0.9rem] font-semibold text-[#9c4f2e] transition hover:bg-white"
        >
          Log out
        </button>
      </form>
    </aside>
  );
}

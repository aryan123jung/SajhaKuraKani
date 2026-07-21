"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthUser } from "@/lib/api/auth";
import { logoutAction } from "@/lib/actions/auth";
import { adminNavItems } from "./admin-schema";

type AdminShellProps = {
  children: React.ReactNode;
  csrfToken: string;
  user: AuthUser;
  sessionMessage?: string | null;
};

export default function AdminShell({
  children,
  csrfToken,
  user,
  sessionMessage,
}: AdminShellProps) {
  const pathname = usePathname();
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const initials =
    `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "AD";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,145,77,0.16),_transparent_28rem),radial-gradient(circle_at_bottom_right,_rgba(255,110,69,0.08),_transparent_32rem),linear-gradient(180deg,#fffdfa_0%,#fff7f0_52%,#fffaf6_100%)] text-[#1d243f]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1720px] grid-cols-1 gap-4 px-3 py-4 lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)] backdrop-blur lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div className="rounded-[22px] border border-[#efe2d9] bg-[linear-gradient(180deg,#fffaf6_0%,#fff6ef_100%)] p-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
              Admin Console
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1d243f] text-sm font-semibold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[0.98rem] font-semibold text-[#1d243f]">
                  {fullName}
                </p>
                <p className="truncate text-[0.76rem] text-[#7a7381]">@{user.username}</p>
              </div>
            </div>
          </div>

          <nav className="mt-4 space-y-2">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-[18px] px-3.5 py-3 transition ${
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
                    <p className={`truncate text-[0.72rem] ${isActive ? "text-white/82" : "text-[#8a8390]"}`}>
                      {item.caption}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3 pt-4">
            <Link
              href="/user/home"
              className="inline-flex w-full items-center justify-center rounded-[16px] border border-[#efe2d9] bg-[#fff8f3] px-4 py-3 text-[0.9rem] font-semibold text-[#526077] transition hover:bg-white"
            >
              Back to user side
            </Link>

            <form action={logoutAction}>
              <input type="hidden" name="_csrf" value={csrfToken} />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-[16px] border border-[#f2c3b7] bg-[#fff1ed] px-4 py-3 text-[0.9rem] font-semibold text-[#b14f3f] transition hover:bg-[#ffe7dd]"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <main className="space-y-4">
          <header className="rounded-[28px] border border-[#ead6ca] bg-[radial-gradient(circle_at_top_left,rgba(255,145,77,0.18),transparent_20rem),linear-gradient(180deg,#fffdfa_0%,#fff7f0_100%)] px-6 py-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
                  Protected Admin Surface
                </p>
                <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-[#1d243f]">
                  Security operations
                </h1>
                <p className="mt-2 max-w-3xl text-[0.94rem] leading-7 text-[#6a7282]">
                  Review reports, control abusive accounts, inspect alerts, and keep the audit trail intact from one admin workspace.
                </p>
              </div>
              <div className="rounded-[18px] border border-[#f1cdb8] bg-white/80 px-4 py-3 text-right shadow-[0_10px_22px_rgba(128,84,53,0.04)]">
                <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[#8c8690]">
                  Role
                </p>
                <p className="mt-2 text-sm font-semibold text-[#1d243f]">
                  {user.role.toUpperCase()}
                </p>
              </div>
            </div>
          </header>

          {sessionMessage ? (
            <div className="rounded-[20px] border border-[#efb697] bg-[#fff0e6] px-4 py-3 text-sm text-[#9c4f2e] shadow-[0_18px_34px_rgba(241,111,56,0.08)]">
              {sessionMessage}
            </div>
          ) : null}

          {children}
        </main>
      </div>
    </div>
  );
}

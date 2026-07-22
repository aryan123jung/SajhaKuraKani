"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { AuthUser } from "@/lib/api/auth";
import CallCenter from "./CallCenter";
import SideNavbar from "./SideNavbar";
import TopNavbar from "./TopNavbar";

type UserShellProps = {
  children: React.ReactNode;
  csrfToken: string;
  user: AuthUser | null;
  sessionMessage?: string | null;
};

export default function Navbar({
  children,
  csrfToken,
  user,
  sessionMessage,
}: UserShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,145,77,0.16),_transparent_25rem),radial-gradient(circle_at_bottom_right,_rgba(255,110,69,0.1),_transparent_30rem),linear-gradient(180deg,#fffdfa_0%,#fff7f0_54%,#fffaf6_100%)] text-[#1d243f]">
      <CallCenter currentUser={user} />

      <div className="sticky top-0 z-50">
        <TopNavbar
          currentPath={pathname}
          onMenuClick={() => setSidebarOpen((open) => !open)}
          sidebarOpen={sidebarOpen}
        />
      </div>

      <div
        className={`fixed inset-0 z-40 bg-[#1d243f]/28 backdrop-blur-sm transition ${
          sidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      <div
        className={`fixed left-0 top-0 z-[60] h-screen w-[280px] max-w-[100vw] transition duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <SideNavbar
          currentPath={pathname}
          csrfToken={csrfToken}
          user={user}
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      <div className="mx-auto w-full max-w-[1780px] px-2 py-4 sm:px-3 lg:px-4">
        <main className="pb-6 pt-4">
          {sessionMessage ? (
            <div className="mb-4 rounded-[18px] border border-[#efb697] bg-[#fff0e6] px-4 py-3 text-sm text-[#9c4f2e] shadow-[0_18px_34px_rgba(241,111,56,0.08)]">
              {sessionMessage}
            </div>
          ) : null}

          {children}
        </main>
      </div>
    </div>
  );
}

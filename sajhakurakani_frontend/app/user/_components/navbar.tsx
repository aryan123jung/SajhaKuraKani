"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { AuthUser } from "@/lib/api/auth";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,169,120,0.22),_transparent_26rem),radial-gradient(circle_at_bottom_right,_rgba(255,132,83,0.14),_transparent_30rem),linear-gradient(180deg,#fffdfa_0%,#fff6ee_56%,#fffaf6_100%)] text-[#1d243f]">
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
        className={`fixed left-0 top-[64px] z-50 h-[calc(100vh-64px)] w-[250px] max-w-[calc(100vw-1rem)] px-3 pb-3 pt-2 transition duration-300 sm:px-4 ${
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

      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-5 lg:px-6">
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

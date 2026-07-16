import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";
import type { AuthUser } from "@/lib/api/auth";
import { getCsrfToken } from "@/lib/csrf";

type ProtectedShellProps = {
  children: React.ReactNode;
  currentPath: "/" | "/settings";
  user: AuthUser | null;
  sessionMessage?: string | null;
};

const navItems: Array<{ href: "/" | "/settings"; label: string }> = [
  { href: "/", label: "Overview" },
  { href: "/settings", label: "Settings" },
];

export default async function ProtectedShell({
  children,
  currentPath,
  user,
  sessionMessage,
}: ProtectedShellProps) {
  const csrfToken = await getCsrfToken();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,190,150,0.18),_transparent_30%),linear-gradient(180deg,#141215_0%,#1b171b_60%,#111013_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl overflow-hidden rounded-[36px] border border-white/10 bg-[rgba(18,16,20,0.72)] shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 lg:border-b-0 lg:border-r lg:border-white/8 lg:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/7 text-2xl font-bold text-[#ffb089] shadow-[0_18px_36px_rgba(0,0,0,0.22)]">
              SK
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/38">
                Secure Social Platform
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                SajhaKuraKani
              </h1>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">
              Signed In As
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {user ? `${user.firstName} ${user.lastName}` : "Session active"}
            </p>
            <p className="mt-2 break-all text-sm text-white/55">
              {user?.email ?? "Your secure workspace is ready."}
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const isActive = currentPath === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-[linear-gradient(135deg,#f7683c_0%,#ff9f6e_100%)] text-white shadow-[0_14px_35px_rgba(247,104,60,0.28)]"
                      : "border border-white/8 bg-white/4 text-white/68 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <form action={logoutAction} className="mt-8">
            <input type="hidden" name="_csrf" value={csrfToken} />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-white/12 bg-white/4 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/8"
            >
              Log Out
            </button>
          </form>
        </aside>

        <main className="p-6 sm:p-8 lg:p-10">
          {sessionMessage ? (
            <div className="mb-8 rounded-2xl border border-[#ff885f]/35 bg-[#ff885f]/12 px-4 py-3 text-sm text-[#ffd4c4]">
              {sessionMessage}
            </div>
          ) : null}

          {children}
        </main>
      </div>
    </div>
  );
}

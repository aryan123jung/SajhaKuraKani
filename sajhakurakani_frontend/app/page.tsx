import Link from "next/link";
import { getAuthToken } from "@/lib/cookie";
import { logoutAction } from "@/lib/actions/auth";

export default async function Home() {
  const token = await getAuthToken();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,190,150,0.18),_transparent_30%),linear-gradient(180deg,#141215_0%,#1b171b_60%,#111013_100%)] px-6 py-14 text-white">
      <main className="w-full max-w-4xl rounded-[40px] border border-white/10 bg-white/6 p-8 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-12">
        <div className="max-w-2xl space-y-6">
          <p className="text-xs uppercase tracking-[0.34em] text-[#ffb089]">
            Auth Gateway
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            {token
              ? "You are signed in to the protected workspace."
              : "Secure frontend scaffolding is ready."}
          </h1>
          <p className="text-base leading-8 text-white/62">
            The login route is now wired to your backend using server actions,
            an httpOnly auth cookie, a shared axios API client, and route
            protection through the root proxy.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          {token ? (
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7683c_0%,#ff9f6e_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(247,104,60,0.35)]"
              >
                Log Out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7683c_0%,#ff9f6e_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(247,104,60,0.35)]"
            >
              Open Login Page
            </Link>
          )}
          <div className="inline-flex items-center rounded-2xl border border-white/12 bg-white/5 px-5 py-3.5 text-sm text-white/58">
            Session active: {token ? "yes" : "no"}
          </div>
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";
import { getAuthToken } from "@/lib/cookie";
import { logoutAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/api/auth";

export default async function Home() {
  const token = await getAuthToken();
  let user = null;
  let sessionMessage: string | null = null;

  if (token) {
    try {
      const response = await getCurrentUser();
      user = response.data;
    } catch (error) {
      sessionMessage =
        error instanceof Error
          ? error.message
          : "Unable to load your account right now.";
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,190,150,0.18),_transparent_30%),linear-gradient(180deg,#141215_0%,#1b171b_60%,#111013_100%)] px-6 py-14 text-white">
      <main className="w-full max-w-4xl rounded-[40px] border border-white/10 bg-white/6 p-8 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-12">
        <div className="max-w-2xl space-y-6">
          <p className="text-xs uppercase tracking-[0.34em] text-[#ffb089]">
            Auth Gateway
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            {user
              ? `Welcome back, ${user.firstName}.`
              : token
              ? "Your session is connected, but we could not load your profile."
              : "Secure frontend scaffolding is ready."}
          </h1>
          <p className="text-base leading-8 text-white/62">
            {user
              ? "This page is using your secure auth cookie to call the protected backend endpoint and load your account details."
              : "The login route is now wired to your backend using server actions, an httpOnly auth cookie, a shared axios API client, and route protection through the root proxy."}
          </p>
        </div>

        {user ? (
          <section className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                Full Name
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {user.firstName} {user.lastName}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                Email
              </p>
              <p className="mt-3 break-all text-lg font-semibold text-white">
                {user.email}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                Role
              </p>
              <p className="mt-3 text-lg font-semibold capitalize text-white">
                {user.role}
              </p>
            </div>
          </section>
        ) : null}

        {sessionMessage ? (
          <div className="mt-8 rounded-2xl border border-[#ff885f]/35 bg-[#ff885f]/12 px-4 py-3 text-sm text-[#ffd4c4]">
            {sessionMessage}
          </div>
        ) : null}

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
            Session active: {user ? "yes" : token ? "token present" : "no"}
          </div>
        </div>
      </main>
    </div>
  );
}

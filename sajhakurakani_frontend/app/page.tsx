import { getAuthToken } from "@/lib/cookie";
import { getCurrentUser } from "@/lib/api/auth";
import ProtectedShell from "./_components/ProtectedShell";

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
    <ProtectedShell currentPath="/" user={user} sessionMessage={sessionMessage}>
      <div className="max-w-3xl space-y-6">
        <div className="max-w-2xl space-y-6">
          <p className="text-xs uppercase tracking-[0.34em] text-[#ffb089]">
            Workspace Overview
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
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                Username
              </p>
              <p className="mt-3 break-all text-lg font-semibold text-white">
                {user.username}
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

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-[#ffb089]">
            Security Status
          </p>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row">
            <div className="inline-flex items-center rounded-2xl border border-white/12 bg-white/5 px-5 py-3.5 text-sm text-white/58">
              Session active: {user ? "yes" : token ? "token present" : "no"}
            </div>
            <div className="inline-flex items-center rounded-2xl border border-white/12 bg-white/5 px-5 py-3.5 text-sm text-white/58">
              Two-factor authentication: {user?.totpEnabled ? "enabled" : "not enabled"}
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-white/58">
            Manage your authenticator-based two-factor authentication from the
            Settings section in the left sidebar.
          </p>
        </div>
      </div>
    </ProtectedShell>
  );
}

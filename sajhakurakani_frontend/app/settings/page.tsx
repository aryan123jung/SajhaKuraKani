import ProtectedShell from "@/app/_components/ProtectedShell";
import TotpManager from "@/app/_components/TotpManager";
import { getAuthToken } from "@/lib/cookie";
import { getCurrentUser } from "@/lib/api/auth";

export default async function SettingsPage() {
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
    <ProtectedShell
      currentPath="/settings"
      user={user}
      sessionMessage={sessionMessage}
    >
      <div className="max-w-4xl space-y-6">
        <div className="max-w-2xl space-y-4">
          <p className="text-xs uppercase tracking-[0.34em] text-[#ffb089]">
            Settings
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Account security controls
          </h1>
          <p className="text-base leading-8 text-white/62">
            Keep two-factor authentication here so it feels like a proper account
            setting instead of part of the landing screen. Once enabled, both
            password login and Google sign-in will require your authenticator
            code.
          </p>
        </div>

        {user ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                Account
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
                2FA Status
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {user.totpEnabled ? "Enabled" : "Disabled"}
              </p>
            </div>
          </section>
        ) : null}

        {user ? <TotpManager totpEnabled={Boolean(user.totpEnabled)} /> : null}
      </div>
    </ProtectedShell>
  );
}

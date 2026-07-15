import Link from "next/link";
import ResetPasswordForm from "../_components/ResetPasswordForm";
import { validatePasswordResetToken } from "@/lib/api/auth";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.token?.trim();

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,190,150,0.18),_transparent_30%),linear-gradient(180deg,#141215_0%,#1b171b_60%,#111013_100%)] px-6 py-14 text-white">
        <div className="w-full max-w-xl rounded-[34px] border border-white/10 bg-white/6 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-[#ffb089]">
            Reset Password
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">
            Reset link missing
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/62">
            This reset link is incomplete. Request a new password reset email to continue.
          </p>
          <Link
            href="/request-reset-password"
            className="mt-8 inline-flex rounded-2xl bg-[linear-gradient(135deg,#f7683c_0%,#ff9f6e_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(247,104,60,0.35)]"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  let validationEmail: string | null = null;
  let validationError: string | null = null;

  try {
    const response = await validatePasswordResetToken(token);
    validationEmail = response.data.email;
  } catch (error) {
    validationError =
      error instanceof Error
        ? error.message
        : "This reset link is invalid or has expired. Request a new one.";
  }

  if (validationEmail) {
    return <ResetPasswordForm token={token} email={validationEmail} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,190,150,0.18),_transparent_30%),linear-gradient(180deg,#141215_0%,#1b171b_60%,#111013_100%)] px-6 py-14 text-white">
      <div className="w-full max-w-xl rounded-[34px] border border-white/10 bg-white/6 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
        <p className="text-xs uppercase tracking-[0.28em] text-[#ffb089]">
          Reset Password
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">
          Reset link unavailable
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/62">
          {validationError ?? "This reset link is invalid or has expired. Request a new one."}
        </p>
        <Link
          href="/request-reset-password"
          className="mt-8 inline-flex rounded-2xl bg-[linear-gradient(135deg,#f7683c_0%,#ff9f6e_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(247,104,60,0.35)]"
        >
          Request New Link
        </Link>
      </div>
    </div>
  );
}

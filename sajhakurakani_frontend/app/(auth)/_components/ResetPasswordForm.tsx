"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "@/lib/actions/password-reset";
import { initialResetPasswordActionState } from "@/lib/actions/auth-state";

type ResetPasswordFormProps = {
  csrfToken: string;
  token: string;
  email: string;
};

export default function ResetPasswordForm({
  csrfToken,
  token,
  email,
}: ResetPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction.bind(null, token),
    initialResetPasswordActionState
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,190,150,0.18),_transparent_30%),linear-gradient(180deg,#141215_0%,#1b171b_60%,#111013_100%)] px-6 py-14 text-white">
      <div className="w-full max-w-xl rounded-[34px] border border-white/10 bg-white/6 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
        <p className="text-xs uppercase tracking-[0.28em] text-[#ffb089]">
          Choose New Password
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">
          Reset your password
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/62">
          Create a strong new password for <span className="text-white">{email}</span>.
          This link can only be used once.
        </p>

        <form action={formAction} className="mt-8 space-y-5">
          <input type="hidden" name="_csrf" value={csrfToken} />

          <div className="space-y-2">
            <label
              htmlFor="newPassword"
              className="text-xs font-medium uppercase tracking-[0.24em] text-white/48"
            >
              New Password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="Enter your new password"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-sm text-white outline-none ring-0 transition focus:border-[#ff9166] focus:bg-white/8"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-xs font-medium uppercase tracking-[0.24em] text-white/48"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-sm text-white outline-none ring-0 transition focus:border-[#ff9166] focus:bg-white/8"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-xs leading-6 text-white/55">
            Passwords must be at least 8 characters and include uppercase,
            lowercase, a number, and a special character.
          </div>

          {state.message ? (
            <div className="rounded-2xl border border-[#ff885f]/35 bg-[#ff885f]/12 px-4 py-3 text-sm text-[#ffd4c4]">
              {state.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7683c_0%,#ff9f6e_100%)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(247,104,60,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Resetting password..." : "Reset Password"}
          </button>
        </form>

        <Link
          href="/login"
          className="mt-8 inline-flex text-sm font-medium text-[#ffb089] transition hover:text-[#ffd1b7]"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}

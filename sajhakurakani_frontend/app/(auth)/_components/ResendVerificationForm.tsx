"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resendVerificationAction } from "@/lib/actions/auth";
import { initialResendVerificationActionState } from "@/lib/actions/auth-state";

type ResendVerificationFormProps = {
  csrfToken: string;
  initialEmail?: string;
};

export default function ResendVerificationForm({
  csrfToken,
  initialEmail,
}: ResendVerificationFormProps) {
  const [state, formAction, isPending] = useActionState(
    resendVerificationAction,
    initialResendVerificationActionState
  );

  const safeEmail = state.email || initialEmail || "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,190,150,0.18),_transparent_30%),linear-gradient(180deg,#141215_0%,#1b171b_60%,#111013_100%)] px-6 py-14 text-white">
      <div className="w-full max-w-xl rounded-[34px] border border-white/10 bg-white/6 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
        <p className="text-xs uppercase tracking-[0.28em] text-[#ffb089]">
          Email Verification
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">
          Resend verification link
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/62">
          Enter your email address and we&apos;ll send another verification link if the
          account still needs to be confirmed.
        </p>

        <form action={formAction} className="mt-8 space-y-5">
          <input type="hidden" name="_csrf" value={csrfToken} />

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-xs font-medium uppercase tracking-[0.24em] text-white/48"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={safeEmail}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-sm text-white outline-none transition focus:border-[#ff9166] focus:bg-white/8"
            />
          </div>

          {state.message ? (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                state.success
                  ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                  : "border border-[#ff885f]/35 bg-[#ff885f]/12 text-[#ffd4c4]"
              }`}
            >
              {state.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7683c_0%,#ff9f6e_100%)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(247,104,60,0.35)] transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isPending ? "Sending verification link..." : "Send Verification Link"}
          </button>
        </form>

        <div className="mt-8 border-t border-white/8 pt-6">
          <Link
            href="/login"
            className="text-sm font-medium text-[#ffb089] transition hover:text-[#ffd1b7]"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

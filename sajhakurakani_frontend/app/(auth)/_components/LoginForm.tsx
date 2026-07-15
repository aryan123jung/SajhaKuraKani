"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, startGoogleLoginAction } from "@/lib/actions/auth";
import { initialLoginActionState } from "@/lib/actions/auth-state";

type LoginFormProps = {
  oauthError?: string;
  notice?: string;
  initialEmail?: string;
};

export default function LoginForm({
  oauthError,
  notice,
  initialEmail,
}: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialLoginActionState
  );
  const safeState = {
    ...initialLoginActionState,
    ...state,
    fields: {
      ...initialLoginActionState.fields,
      ...(state?.fields ?? {}),
    },
  };

  return (
    <div className="grid min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,186,143,0.2),_transparent_26%),linear-gradient(135deg,#120f12_0%,#1d1a1f_40%,#221814_100%)] text-white lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden border-r border-white/6 px-10 py-10 lg:flex">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_45%)]" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/7 text-2xl font-bold text-[#ffb089] shadow-[0_18px_36px_rgba(0,0,0,0.22)]">
            SK
          </div>
          <div className="pt-1">
            <p className="text-xs uppercase tracking-[0.38em] text-white/38">
              Secure Social Platform
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">
              SajhaKuraKani
            </h1>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="w-full max-w-md rounded-[34px] border border-white/10 bg-[rgba(20,18,20,0.8)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
          <div className="mb-8 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[#ffb089]">
              Welcome Back
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white">
              Sign in to your account
            </h2>
            <p className="text-sm leading-6 text-white/55">
              Start with your email and password. If this account has
              two-factor authentication enabled, we&apos;ll take you to a separate
              verification step next.
            </p>
          </div>

          <form action={formAction} className="space-y-5">
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
                defaultValue={safeState.fields.email || initialEmail || ""}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-sm text-white outline-none ring-0 transition focus:border-[#ff9166] focus:bg-white/8"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-medium uppercase tracking-[0.24em] text-white/48"
                >
                  Password
                </label>
                <Link
                  href="/request-reset-password"
                  className="text-xs font-medium text-[#ffb089] transition hover:text-[#ffd1b7]"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                defaultValue={safeState.fields.password}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-sm text-white outline-none ring-0 transition focus:border-[#ff9166] focus:bg-white/8"
              />
            </div>

            {notice ? (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {notice}
              </div>
            ) : null}

            {oauthError ? (
              <div className="rounded-2xl border border-[#ff885f]/35 bg-[#ff885f]/12 px-4 py-3 text-sm text-[#ffd4c4]">
                {oauthError}
              </div>
            ) : null}

            {safeState.message ? (
              <div className="rounded-2xl border border-[#ff885f]/35 bg-[#ff885f]/12 px-4 py-3 text-sm text-[#ffd4c4]">
                {safeState.message}
              </div>
            ) : null}

            <div className="space-y-3 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7683c_0%,#ff9f6e_100%)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(247,104,60,0.35)] transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isPending ? "Signing you in..." : "Sign in"}
              </button>

              <button
                type="submit"
                formAction={startGoogleLoginAction}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-white/12 bg-white/4 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/8"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#111]">
                  G
                </span>
                Continue with Google
              </button>
            </div>
          </form>

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/8 pt-6 text-sm text-white/45">
            <p>Need a new account?</p>
            <Link
              href="/register"
              className="font-medium text-[#ffb089] transition hover:text-[#ffd1b7]"
            >
              Create one
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}

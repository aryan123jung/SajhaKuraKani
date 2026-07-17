"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, startGoogleLoginAction } from "@/lib/actions/auth";
import { initialLoginActionState } from "@/lib/actions/auth-state";
import AuthShell from "./AuthShell";

type LoginFormProps = {
  csrfToken: string;
  oauthError?: string;
  notice?: string;
  initialEmail?: string;
};

export default function LoginForm({
  csrfToken,
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
  const shouldShowResendVerificationLink = safeState.message
    .toLowerCase()
    .includes("verify your email first");

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your account"
      description="Enter your credentials to continue."
      width="narrow"
      footer={
        <div className="auth-foot-row">
          <p>Need a new account?</p>
          <Link href="/register" className="auth-link">
            Create one
          </Link>
        </div>
      }
    >
      <form action={formAction} className="space-y-5">
            <input type="hidden" name="_csrf" value={csrfToken} />

            <div className="auth-field">
              <label
                htmlFor="email"
                className="auth-field-label"
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
                className="auth-input"
              />
            </div>

            <div className="auth-field">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="auth-field-label"
                >
                  Password
                </label>
                <Link
                  href="/request-reset-password"
                  className="auth-link text-xs"
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
                className="auth-input"
              />
            </div>

            {notice ? (
              <div className="auth-message" data-tone="success">
                {notice}
              </div>
            ) : null}

            {oauthError ? (
              <div className="auth-message" data-tone="error">
                {oauthError}
              </div>
            ) : null}

            {safeState.message ? (
              <div className="auth-message" data-tone="error">
                <p>{safeState.message}</p>
                {shouldShowResendVerificationLink ? (
                  <Link
                    href={`/resend-verification?email=${encodeURIComponent(
                      safeState.fields.email || initialEmail || ""
                    )}`}
                    className="mt-3 inline-flex text-xs font-medium text-[#e97743] underline underline-offset-4 transition hover:text-[#c85f2b]"
                  >
                    Resend verification email
                  </Link>
                ) : null}
              </div>
            ) : null}

            <div className="auth-actions pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="auth-button-primary"
              >
                {isPending ? "Signing you in..." : "Sign in"}
              </button>

              <button
                type="submit"
                formAction={startGoogleLoginAction}
                disabled={isPending}
                className="auth-button-secondary"
              >
                <span className="auth-google-mark">G</span>
                Continue with Google
              </button>
            </div>
      </form>
    </AuthShell>
  );
}

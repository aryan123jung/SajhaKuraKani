"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction } from "@/lib/actions/password-reset";
import { initialRequestPasswordResetActionState } from "@/lib/actions/auth-state";
import AuthShell from "./AuthShell";

type RequestResetPasswordFormProps = {
  csrfToken: string;
};

export default function RequestResetPasswordForm({
  csrfToken,
}: RequestResetPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    initialRequestPasswordResetActionState
  );

  return (
    <AuthShell
      eyebrow="Reset password"
      title="Request a secure reset link"
      description="Enter your email address. If an account exists for it, we’ll send a one-time reset link that expires quickly."
      footer={
        <Link href="/login" className="auth-link text-sm">
          Back to sign in
        </Link>
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
              defaultValue={state.email}
              placeholder="you@example.com"
              autoComplete="email"
              className="auth-input"
            />
          </div>

          {state.message ? (
            <div
              className="auth-message"
              data-tone={state.success ? "success" : "error"}
            >
              {state.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="auth-button-primary"
          >
            {isPending ? "Sending secure link..." : "Send Reset Link"}
          </button>
      </form>
    </AuthShell>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "@/lib/actions/password-reset";
import { initialResetPasswordActionState } from "@/lib/actions/auth-state";
import AuthShell from "./AuthShell";

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
    <AuthShell
      eyebrow="Choose new password"
      title="Reset your password"
      description={`Create a strong new password for ${email}. This link can only be used once.`}
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
              htmlFor="newPassword"
              className="auth-field-label"
            >
              New Password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="Enter your new password"
              autoComplete="new-password"
              className="auth-input"
            />
          </div>

          <div className="auth-field">
            <label
              htmlFor="confirmPassword"
              className="auth-field-label"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              autoComplete="new-password"
              className="auth-input"
            />
          </div>

          <div className="auth-message" data-tone="hint">
            Passwords must be at least 8 characters and include uppercase,
            lowercase, a number, and a special character.
          </div>

          {state.message ? (
            <div className="auth-message" data-tone="error">
              {state.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="auth-button-primary"
          >
            {isPending ? "Resetting password..." : "Reset Password"}
          </button>
      </form>
    </AuthShell>
  );
}

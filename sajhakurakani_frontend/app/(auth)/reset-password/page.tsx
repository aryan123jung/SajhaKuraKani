import Link from "next/link";
import ResetPasswordForm from "../_components/ResetPasswordForm";
import AuthShell from "../_components/AuthShell";
import { validatePasswordResetToken } from "@/lib/api/auth";
import { getCsrfToken } from "@/lib/csrf";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const csrfToken = await getCsrfToken();
  const token = params.token?.trim();

  if (!token) {
    return (
      <AuthShell
        eyebrow="Reset password"
        title="Reset link missing"
        description="This reset link is incomplete. Request a new password reset email to continue."
      >
        <Link href="/request-reset-password" className="auth-button-primary">
          Request New Link
        </Link>
      </AuthShell>
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
    return (
      <ResetPasswordForm
        csrfToken={csrfToken}
        token={token}
        email={validationEmail}
      />
    );
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      title="Reset link unavailable"
      description={
        validationError ??
        "This reset link is invalid or has expired. Request a new one."
      }
    >
      <div className="auth-message" data-tone="error">
        Password reset could not be started from this link.
      </div>
      <Link href="/request-reset-password" className="auth-button-primary">
        Request New Link
      </Link>
    </AuthShell>
  );
}

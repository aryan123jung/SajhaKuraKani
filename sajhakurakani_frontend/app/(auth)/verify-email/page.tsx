import Link from "next/link";
import { verifyEmail } from "@/lib/api/auth";
import AuthShell from "../_components/AuthShell";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params.token?.trim();

  if (!token) {
    return (
      <AuthShell
        eyebrow="Email verification"
        title="Verification link missing"
        description="This verification link is incomplete. Request a new verification email to continue."
      >
        <Link href="/resend-verification" className="auth-button-primary">
          Request New Link
        </Link>
      </AuthShell>
    );
  }

  let verifiedEmail: string | null = null;
  let verificationError: string | null = null;

  try {
    const response = await verifyEmail(token);
    verifiedEmail = response.data.email;
  } catch (error) {
    verificationError =
      error instanceof Error
        ? error.message
        : "This verification link is invalid or has expired. Request a new one.";
  }

  if (verifiedEmail) {
    return (
      <AuthShell
        eyebrow="Email verification"
        title="Email verified successfully"
        description={`${verifiedEmail} is now verified. You can sign in to your account.`}
      >
        <div className="auth-message" data-tone="success">
          Your account is active and ready for sign-in.
        </div>
        <Link
          href={`/login?verified=1&email=${encodeURIComponent(verifiedEmail)}`}
          className="auth-button-primary"
        >
          Continue to Sign In
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Email verification"
      title="Verification link unavailable"
      description={
        verificationError ??
        "This verification link is invalid or has expired. Request a new one."
      }
    >
      <div className="auth-message" data-tone="error">
        Verification could not be completed from this link.
      </div>
      <Link href="/resend-verification" className="auth-button-primary">
        Request New Link
      </Link>
    </AuthShell>
  );
}

import Link from "next/link";
import AuthShell from "../_components/AuthShell";

type CheckEmailPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function CheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const params = await searchParams;
  const email = params.email?.trim();

  return (
    <AuthShell
      eyebrow="Email verification"
      title="Check your inbox"
      description={
        email
          ? `We sent a verification link to ${email}. Open the email and click the link to activate your account before signing in.`
          : "We sent you a verification link. Open the email and click the link to activate your account before signing in."
      }
      width="narrow"
      footer={
        <div className="auth-foot-row">
          <p>Already verified?</p>
          <Link href={email ? `/login?email=${encodeURIComponent(email)}` : "/login"} className="auth-link">
            Sign in
          </Link>
        </div>
      }
    >
      <div className="auth-message" data-tone="success">
        Click the verification link in your email to continue.
      </div>

      <div className="auth-actions">
        <Link
          href={email ? `/resend-verification?email=${encodeURIComponent(email)}` : "/resend-verification"}
          className="auth-button-primary"
        >
          Resend verification email
        </Link>

        <Link
          href={email ? `/login?email=${encodeURIComponent(email)}` : "/login"}
          className="auth-button-secondary"
        >
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}

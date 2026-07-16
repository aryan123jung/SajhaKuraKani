import LoginForm from "../_components/LoginForm";
import { getCsrfToken } from "@/lib/csrf";

type LoginPageProps = {
  searchParams: Promise<{
    oauthError?: string;
    registered?: string;
    verificationSent?: string;
    verified?: string;
    reset?: string;
    email?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const csrfToken = await getCsrfToken();
  const notice =
    params.verified === "1"
      ? "Email verified successfully. You can sign in now."
      : params.registered === "1" || params.verificationSent === "1"
      ? "Account created. Check your email to verify your account before signing in."
      : params.reset === "1"
      ? "Password reset successful. Sign in with your new password."
      : undefined;

  return (
    <LoginForm
      csrfToken={csrfToken}
      oauthError={params.oauthError}
      notice={notice}
      initialEmail={params.email}
    />
  );
}

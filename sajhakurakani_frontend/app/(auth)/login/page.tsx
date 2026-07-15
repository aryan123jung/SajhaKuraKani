import LoginForm from "../_components/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{
    oauthError?: string;
    registered?: string;
    reset?: string;
    email?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const notice =
    params.registered === "1"
      ? "Account created successfully. You can sign in now."
      : params.reset === "1"
      ? "Password reset successful. Sign in with your new password."
      : undefined;

  return (
    <LoginForm
      oauthError={params.oauthError}
      notice={notice}
      initialEmail={params.email}
    />
  );
}

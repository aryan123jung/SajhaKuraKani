import LoginForm from "../_components/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{
    oauthError?: string;
    registered?: string;
    email?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const notice =
    params.registered === "1"
      ? "Account created successfully. You can sign in now."
      : undefined;

  return (
    <LoginForm
      oauthError={params.oauthError}
      notice={notice}
      initialEmail={params.email}
    />
  );
}

import LoginForm from "../_components/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{
    oauthError?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return <LoginForm oauthError={params.oauthError} />;
}

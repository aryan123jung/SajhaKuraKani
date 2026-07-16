import ResendVerificationForm from "../_components/ResendVerificationForm";
import { getCsrfToken } from "@/lib/csrf";

type ResendVerificationPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function ResendVerificationPage({
  searchParams,
}: ResendVerificationPageProps) {
  const params = await searchParams;
  const csrfToken = await getCsrfToken();

  return (
    <ResendVerificationForm
      csrfToken={csrfToken}
      initialEmail={params.email}
    />
  );
}

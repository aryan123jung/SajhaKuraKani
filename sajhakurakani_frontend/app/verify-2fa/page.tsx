import { redirect } from "next/navigation";
import { getTwoFactorPreAuthToken } from "@/lib/cookie";
import { getCsrfToken } from "@/lib/csrf";
import VerifyTotpForm from "./verify-totp-form";

type VerifyTwoFactorPageProps = {
  searchParams: Promise<{
    email?: string;
    method?: string;
  }>;
};

export default async function VerifyTwoFactorPage({
  searchParams,
}: VerifyTwoFactorPageProps) {
  const pendingToken = await getTwoFactorPreAuthToken();
  const csrfToken = await getCsrfToken();

  if (!pendingToken) {
    redirect("/login");
  }

  const params = await searchParams;
  const method = params.method === "google" ? "google" : "password";

  return (
    <VerifyTotpForm
      csrfToken={csrfToken}
      email={params.email}
      method={method}
    />
  );
}

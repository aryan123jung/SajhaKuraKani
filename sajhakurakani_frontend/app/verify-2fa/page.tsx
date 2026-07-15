import { redirect } from "next/navigation";
import { getTwoFactorPreAuthToken } from "@/lib/cookie";
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

  if (!pendingToken) {
    redirect("/login");
  }

  const params = await searchParams;
  const method = params.method === "google" ? "google" : "password";

  return <VerifyTotpForm email={params.email} method={method} />;
}

import { redirect } from "next/navigation";
import { getGoogleTotpPreAuthToken } from "@/lib/cookie";
import GoogleTotpForm from "./totp-form";

type GoogleTotpPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function GoogleTotpPage({
  searchParams,
}: GoogleTotpPageProps) {
  const pendingToken = await getGoogleTotpPreAuthToken();

  if (!pendingToken) {
    redirect("/login");
  }

  const params = await searchParams;

  return <GoogleTotpForm email={params.email} />;
}

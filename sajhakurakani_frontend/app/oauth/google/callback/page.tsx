import { redirect } from "next/navigation";
import { exchangeGoogleOAuthCode } from "@/lib/api/auth";
import { setAuthToken } from "@/lib/cookie";

type CallbackPageProps = {
  searchParams: Promise<{
    code?: string;
    state?: string;
    error?: string;
  }>;
};

export default async function GoogleOAuthCallbackPage({
  searchParams,
}: CallbackPageProps) {
  const { code, state, error } = await searchParams;

  if (error) {
    redirect(`/login?oauthError=${encodeURIComponent("Google sign-in was cancelled or denied.")}`);
  }

  if (!code || !state) {
    redirect(`/login?oauthError=${encodeURIComponent("Google sign-in returned incomplete data.")}`);
  }

  try {
    const response = await exchangeGoogleOAuthCode({ code, state });
    await setAuthToken(response.token as string);
  } catch (oauthError) {
    const message =
      oauthError instanceof Error
        ? oauthError.message
        : "Unable to complete Google sign-in right now.";

    redirect(`/login?oauthError=${encodeURIComponent(message)}`);
  }

  redirect("/");
}

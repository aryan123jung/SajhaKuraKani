import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleOAuthCode } from "@/lib/api/auth";
import {
  AUTH_COOKIE_NAME,
  GOOGLE_TOTP_PENDING_COOKIE_NAME,
} from "@/lib/cookie";

function redirectWithError(request: NextRequest, message: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("oauthError", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return redirectWithError(
      request,
      "Google sign-in was cancelled or denied."
    );
  }

  if (!code || !state) {
    return redirectWithError(
      request,
      "Google sign-in returned incomplete data."
    );
  }

  try {
    const response = await exchangeGoogleOAuthCode({ code, state });

    if (response.data.requiresTotp && response.data.preAuthToken) {
      const redirectUrl = new URL("/oauth/google/totp", request.url);
      redirectUrl.searchParams.set("email", response.data.user.email);
      const redirectResponse = NextResponse.redirect(redirectUrl);

      redirectResponse.cookies.set(
        GOOGLE_TOTP_PENDING_COOKIE_NAME,
        response.data.preAuthToken,
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 10,
        }
      );

      return redirectResponse;
    }

    const redirectResponse = NextResponse.redirect(new URL("/", request.url));

    redirectResponse.cookies.set(AUTH_COOKIE_NAME, response.token as string, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 15,
    });

    return redirectResponse;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to complete Google sign-in right now.";

    return redirectWithError(request, message);
  }
}

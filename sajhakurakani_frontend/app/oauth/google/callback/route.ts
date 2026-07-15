import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleOAuthCode } from "@/lib/api/auth";
import { AUTH_COOKIE_NAME } from "@/lib/cookie";

const FIFTEEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 15;

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
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));

    redirectResponse.cookies.set(AUTH_COOKIE_NAME, response.token as string, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: FIFTEEN_DAYS_IN_SECONDS,
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

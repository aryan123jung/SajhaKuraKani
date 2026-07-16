import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/api/auth";
import { getRefreshToken } from "@/lib/cookie";

export async function POST() {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return NextResponse.json(
      { success: false, message: "Refresh token is missing." },
      { status: 401 }
    );
  }

  try {
    const response = await refreshSession(refreshToken);

    return NextResponse.json({
      success: true,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to refresh your session right now.",
      },
      { status: 401 }
    );
  }
}

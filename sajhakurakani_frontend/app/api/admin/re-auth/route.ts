import { NextResponse } from "next/server";
import { reauthenticateAdmin } from "@/lib/api/admin";
import { clearAdminReauthToken, setAdminReauthToken } from "@/lib/cookie";
import { assertValidCsrfToken } from "@/lib/csrf";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    await assertValidCsrfToken(formData);

    const password = String(formData.get("password") || "");
    const totpCode = String(formData.get("totpCode") || "").trim();

    if (!password || !totpCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Password and authenticator code are required.",
        },
        { status: 400 }
      );
    }

    const response = await reauthenticateAdmin(password, totpCode);
    await setAdminReauthToken(response.data.token);

    return NextResponse.json({
      success: true,
      message: "Admin verification unlocked for sensitive actions.",
      data: response.data,
    });
  } catch (error) {
    await clearAdminReauthToken();

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to verify your admin session right now.",
      },
      { status: 500 }
    );
  }
}

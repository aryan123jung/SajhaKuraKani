import { NextResponse } from "next/server";
import {
  actionAdminReport,
  confirmAdminBanUser,
  deleteAdminComment,
  deleteAdminPost,
  deleteAdminUser,
  dismissAdminReport,
  hideAdminComment,
  hideAdminPost,
  initiateAdminBanUser,
  revokeAdminUserSessions,
  suspendAdminUser,
  unbanAdminUser,
} from "@/lib/api/admin";
import { clearAdminReauthToken } from "@/lib/cookie";
import { assertValidCsrfToken } from "@/lib/csrf";

const parsePositiveNumber = (value: FormDataEntryValue | null, fallback: number) => {
  const parsed = Number(String(value || ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    await assertValidCsrfToken(formData);

    const command = String(formData.get("command") || "").trim();
    const id = String(formData.get("id") || "").trim();
    const reason = String(formData.get("reason") || "").trim();
    const durationHours = parsePositiveNumber(formData.get("durationHours"), 24);
    const confirmationId = String(formData.get("confirmationId") || "").trim();

    if (!command || !id) {
      return NextResponse.json(
        { success: false, message: "The admin command payload was incomplete." },
        { status: 400 }
      );
    }

    switch (command) {
      case "report.dismiss": {
        const response = await dismissAdminReport(id, reason);
        return NextResponse.json(response);
      }
      case "report.warn": {
        const response = await actionAdminReport(id, {
          actionType: "warn",
          reason,
        });
        return NextResponse.json(response);
      }
      case "report.suspend": {
        const response = await actionAdminReport(id, {
          actionType: "suspend",
          reason,
          durationHours,
        });
        return NextResponse.json(response);
      }
      case "user.suspend": {
        const response = await suspendAdminUser(id, { reason, durationHours });
        return NextResponse.json(response);
      }
      case "user.unban": {
        const response = await unbanAdminUser(id, reason);
        return NextResponse.json(response);
      }
      case "user.delete": {
        const response = await deleteAdminUser(id, reason);
        return NextResponse.json(response);
      }
      case "user.revoke-sessions": {
        const response = await revokeAdminUserSessions(id, reason);
        return NextResponse.json(response);
      }
      case "user.ban.start": {
        const response = await initiateAdminBanUser(id, reason);
        return NextResponse.json(response);
      }
      case "user.ban.confirm": {
        const response = await confirmAdminBanUser(id, {
          confirmationId,
          reason,
        });
        return NextResponse.json(response);
      }
      case "post.hide": {
        const response = await hideAdminPost(id, reason);
        return NextResponse.json(response);
      }
      case "post.delete": {
        const response = await deleteAdminPost(id, reason);
        return NextResponse.json(response);
      }
      case "comment.hide": {
        const response = await hideAdminComment(id, reason);
        return NextResponse.json(response);
      }
      case "comment.delete": {
        const response = await deleteAdminComment(id, reason);
        return NextResponse.json(response);
      }
      default:
        return NextResponse.json(
          { success: false, message: "Unknown admin command." },
          { status: 400 }
        );
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to complete that admin action right now.";

    if (
      message.toLowerCase().includes("re-authentication") ||
      message.toLowerCase().includes("admin session has expired")
    ) {
      await clearAdminReauthToken();
    }

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}

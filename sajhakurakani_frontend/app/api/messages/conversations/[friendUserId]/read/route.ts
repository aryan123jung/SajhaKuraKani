import { NextResponse } from "next/server";
import { markConversationRead } from "@/lib/api/messages";

type RouteContext = {
  params: Promise<{
    friendUserId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { friendUserId } = await context.params;

  try {
    const response = await markConversationRead(friendUserId);
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update this conversation right now.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: message.toLowerCase().includes("session has expired") ? 401 : 500,
      }
    );
  }
}

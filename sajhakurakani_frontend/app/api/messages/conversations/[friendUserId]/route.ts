import { NextRequest, NextResponse } from "next/server";
import { getConversationMessages, sendConversationMessage } from "@/lib/api/messages";

type RouteContext = {
  params: Promise<{
    friendUserId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { friendUserId } = await context.params;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const size = Number(request.nextUrl.searchParams.get("size") ?? "50");

  try {
    const response = await getConversationMessages(friendUserId, page, size);
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load this conversation right now.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: message.toLowerCase().includes("expired") ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { friendUserId } = await context.params;

  try {
    const body = (await request.json()) as { content?: string };
    const response = await sendConversationMessage(friendUserId, body.content ?? "");
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send this message right now.";

    let status = 500;
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("session has expired")) {
      status = 401;
    } else if (normalizedMessage.includes("too many")) {
      status = 429;
    } else if (
      normalizedMessage.includes("similar") ||
      normalizedMessage.includes("could not be sent")
    ) {
      status = 409;
    } else if (normalizedMessage.includes("conversation is no longer available")) {
      status = 404;
    }

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getMessageConversations } from "@/lib/api/messages";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const size = Number(request.nextUrl.searchParams.get("size") ?? "20");

  try {
    const response = await getMessageConversations(search, page, size);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load your conversations right now.",
        data: [],
        pagination: {
          page,
          size,
          total: 0,
          totalPages: 0,
        },
      },
      { status: 500 }
    );
  }
}

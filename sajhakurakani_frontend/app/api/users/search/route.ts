import { NextRequest, NextResponse } from "next/server";
import { searchUsers } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const size = Number(request.nextUrl.searchParams.get("size") ?? "6");

  try {
    const response = await searchUsers(search, page, size);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to search users right now.",
        data: [],
        pagination: {
          page,
          size,
          totalUsers: 0,
          totalPages: 0,
        },
      },
      { status: 500 }
    );
  }
}

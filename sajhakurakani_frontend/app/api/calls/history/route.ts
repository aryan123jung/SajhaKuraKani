import { NextRequest, NextResponse } from "next/server";
import { listCallHistory } from "@/lib/api/calls";
import type { CallStatus } from "@/lib/call-types";

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const size = Number(request.nextUrl.searchParams.get("size") ?? "20");
  const rawStatus = request.nextUrl.searchParams.get("status")?.trim();
  const status = rawStatus ? (rawStatus as CallStatus) : undefined;

  try {
    const response = await listCallHistory(page, size, status);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load call history right now.",
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

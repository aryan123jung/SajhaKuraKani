import { NextRequest, NextResponse } from "next/server";
import { getFriendOverview } from "@/lib/api/friends";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") ?? undefined;

  try {
    const response = await getFriendOverview(search);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load your friends right now.",
        data: {
          friends: [],
          incomingRequests: [],
          outgoingRequests: [],
          discoverUsers: [],
        },
      },
      { status: 500 }
    );
  }
}

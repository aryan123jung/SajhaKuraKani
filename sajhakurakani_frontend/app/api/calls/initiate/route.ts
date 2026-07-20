import { NextRequest, NextResponse } from "next/server";
import { initiateCall } from "@/lib/api/calls";
import type { CallType } from "@/lib/call-types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      calleeUserId?: string;
      callType?: CallType;
    };

    if (!body.calleeUserId || !body.callType) {
      return NextResponse.json(
        {
          success: false,
          message: "A call recipient and call type are required.",
        },
        { status: 400 }
      );
    }

    const response = await initiateCall(body.calleeUserId, body.callType);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to start the call right now.",
      },
      { status: 500 }
    );
  }
}

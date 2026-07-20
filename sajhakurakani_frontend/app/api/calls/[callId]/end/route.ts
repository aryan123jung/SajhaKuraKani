import { NextResponse } from "next/server";
import { endCall } from "@/lib/api/calls";

export async function POST(
  _request: Request,
  context: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await context.params;
    const response = await endCall(callId);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to end the call right now.",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { declineCall } from "@/lib/api/calls";

export async function POST(
  _request: Request,
  context: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await context.params;
    const response = await declineCall(callId);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to decline the call right now.",
      },
      { status: 500 }
    );
  }
}

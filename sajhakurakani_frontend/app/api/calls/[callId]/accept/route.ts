import { NextResponse } from "next/server";
import { acceptCall } from "@/lib/api/calls";

export async function POST(
  _request: Request,
  context: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await context.params;
    const response = await acceptCall(callId);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to accept the call right now.",
      },
      { status: 500 }
    );
  }
}

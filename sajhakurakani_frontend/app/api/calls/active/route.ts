import { NextResponse } from "next/server";
import { getActiveCall } from "@/lib/api/calls";

export async function GET() {
  try {
    const response = await getActiveCall();
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === "No active call was found.") {
      return NextResponse.json({
        success: true,
        message: "No active call found",
        data: null,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load the active call right now.",
        data: null,
      },
      { status: 500 }
    );
  }
}

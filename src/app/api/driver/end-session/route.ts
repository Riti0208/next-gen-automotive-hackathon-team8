import { NextResponse } from "next/server";
import { endSession } from "@/lib/services/sessionService";

interface EndSessionRequest {
  sessionId: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EndSessionRequest;
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const session = await endSession(sessionId);

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("Error ending session:", error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
}

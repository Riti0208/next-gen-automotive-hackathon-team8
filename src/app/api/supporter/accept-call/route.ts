import { NextResponse } from "next/server";
import {
  assignSupporterToSession,
  updateSessionStatus,
} from "@/lib/services/sessionService";
import { SessionStatus } from "@prisma/client";

interface AcceptCallRequest {
  sessionId: string;
  supporterId: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AcceptCallRequest;
    const { sessionId, supporterId } = body;

    if (!sessionId || !supporterId) {
      return NextResponse.json(
        { error: "sessionId and supporterId are required" },
        { status: 400 }
      );
    }

    await assignSupporterToSession(sessionId, supporterId);

    await updateSessionStatus(sessionId, SessionStatus.ACTIVE);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error accepting call:", error);
    return NextResponse.json(
      { error: "Failed to accept call" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import {
  getOrCreateDriver,
  createSession,
  getOnlineSupporter,
} from "@/lib/services/sessionService";
import type { CreateSessionRequest, CreateSessionResponse } from "@/types/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateSessionRequest;
    const { driverName } = body;

    if (!driverName) {
      return NextResponse.json(
        { error: "Driver name is required" },
        { status: 400 }
      );
    }

    const driver = await getOrCreateDriver(driverName);

    const supporter = await getOnlineSupporter();

    const session = await createSession(driver.id, supporter?.id);

    const response: CreateSessionResponse = {
      sessionId: session.id,
      status: session.status,
      supporterId: session.supporterId || undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error starting session:", error);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
}

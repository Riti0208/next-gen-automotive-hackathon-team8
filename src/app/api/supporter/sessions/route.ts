import { NextResponse } from "next/server";
import { getActiveSessions } from "@/lib/services/sessionService";

export async function GET() {
  try {
    const sessions = await getActiveSessions();

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

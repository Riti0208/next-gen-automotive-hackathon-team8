import { NextResponse } from "next/server";
import { getLatestLocation } from "@/lib/services/locationService";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const location = await getLatestLocation(sessionId);

    if (!location) {
      return NextResponse.json(
        { error: "No location found for this session" },
        { status: 404 }
      );
    }

    return NextResponse.json({ location });
  } catch (error) {
    console.error("Error fetching location:", error);
    return NextResponse.json(
      { error: "Failed to fetch location" },
      { status: 500 }
    );
  }
}

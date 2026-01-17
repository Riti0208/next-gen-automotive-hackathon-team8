import { NextResponse } from "next/server";
import { saveLocation } from "@/lib/services/locationService";
import type { LocationData } from "@/types/location";

interface UpdateLocationRequest extends LocationData {
  sessionId: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpdateLocationRequest;
    const { sessionId, latitude, longitude, heading } = body;

    if (!sessionId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "sessionId, latitude, and longitude are required" },
        { status: 400 }
      );
    }

    const location = await saveLocation(sessionId, {
      latitude,
      longitude,
      heading,
    });

    return NextResponse.json({ success: true, location });
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}

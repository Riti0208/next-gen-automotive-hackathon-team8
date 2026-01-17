import { prisma } from "../mastra";
import type { LocationData } from "@/types/location";

export async function saveLocation(
  sessionId: string,
  location: LocationData
) {
  return prisma.location.create({
    data: {
      sessionId,
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading,
    },
  });
}

export async function getSessionLocations(sessionId: string, limit = 50) {
  return prisma.location.findMany({
    where: {
      sessionId,
    },
    orderBy: {
      timestamp: "desc",
    },
    take: limit,
  });
}

export async function getLatestLocation(sessionId: string) {
  return prisma.location.findFirst({
    where: {
      sessionId,
    },
    orderBy: {
      timestamp: "desc",
    },
  });
}

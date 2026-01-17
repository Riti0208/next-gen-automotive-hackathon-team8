import { prisma } from "../mastra";
import { SessionStatus } from "@prisma/client";

export async function createDriver(name: string) {
  return prisma.driver.create({
    data: {
      name,
    },
  });
}

export async function getOrCreateDriver(name: string) {
  const existingDriver = await prisma.driver.findFirst({
    where: { name },
  });

  if (existingDriver) {
    return existingDriver;
  }

  return createDriver(name);
}

export async function createSession(driverId: string, supporterId?: string) {
  const session = await prisma.session.create({
    data: {
      driverId,
      supporterId,
      status: supporterId ? SessionStatus.CONNECTING : SessionStatus.WAITING,
    },
    include: {
      driver: true,
      supporter: true,
    },
  });

  await prisma.driver.update({
    where: { id: driverId },
    data: { currentSessionId: session.id },
  });

  return session;
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
) {
  return prisma.session.update({
    where: { id: sessionId },
    data: {
      status,
      ...(status === SessionStatus.ENDED ? { endedAt: new Date() } : {}),
    },
  });
}

export async function assignSupporterToSession(
  sessionId: string,
  supporterId: string
) {
  return prisma.session.update({
    where: { id: sessionId },
    data: {
      supporterId,
      status: SessionStatus.CONNECTING,
    },
  });
}

export async function endSession(sessionId: string) {
  const session = await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.ENDED,
      endedAt: new Date(),
    },
    include: {
      driver: true,
    },
  });

  if (session.driver.currentSessionId === sessionId) {
    await prisma.driver.update({
      where: { id: session.driverId },
      data: { currentSessionId: null },
    });
  }

  return session;
}

export async function getSession(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      driver: true,
      supporter: true,
      locations: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
    },
  });
}

export async function getActiveSessions() {
  return prisma.session.findMany({
    where: {
      status: {
        in: [SessionStatus.WAITING, SessionStatus.CONNECTING, SessionStatus.ACTIVE],
      },
    },
    include: {
      driver: true,
      supporter: true,
    },
    orderBy: {
      startedAt: "desc",
    },
  });
}

export async function getOnlineSupporter() {
  return prisma.supporter.findFirst({
    where: {
      isOnline: true,
    },
  });
}

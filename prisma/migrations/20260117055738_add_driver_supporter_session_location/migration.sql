-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('WAITING', 'CONNECTING', 'ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supporter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supporter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "supporterId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'WAITING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "heading" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Driver_currentSessionId_key" ON "Driver"("currentSessionId");

-- CreateIndex
CREATE INDEX "Session_driverId_idx" ON "Session"("driverId");

-- CreateIndex
CREATE INDEX "Session_supporterId_idx" ON "Session"("supporterId");

-- CreateIndex
CREATE INDEX "Location_sessionId_idx" ON "Location"("sessionId");

-- CreateIndex
CREATE INDEX "Location_timestamp_idx" ON "Location"("timestamp");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_currentSessionId_fkey" FOREIGN KEY ("currentSessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_supporterId_fkey" FOREIGN KEY ("supporterId") REFERENCES "Supporter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

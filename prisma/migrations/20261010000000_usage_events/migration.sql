-- CreateEnum
CREATE TYPE "UsageEventType" AS ENUM ('LOGIN', 'SCHEDULE_GENERATED', 'SCHEDULE_DOWNLOADED');

-- CreateEnum
CREATE TYPE "UsageActor" AS ENUM ('ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "type" "UsageEventType" NOT NULL,
    "actor" "UsageActor" NOT NULL,
    "year" INTEGER,
    "month" INTEGER,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageEvent_type_createdAt_idx" ON "UsageEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_createdAt_idx" ON "UsageEvent"("createdAt");


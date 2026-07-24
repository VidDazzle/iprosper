-- CreateTable
CREATE TABLE "SystemHeartbeat" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "checks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemHeartbeat_createdAt_idx" ON "SystemHeartbeat"("createdAt");

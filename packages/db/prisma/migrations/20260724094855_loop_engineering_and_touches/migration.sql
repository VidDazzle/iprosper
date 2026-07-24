-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "promotedAt" TIMESTAMP(3),
ADD COLUMN     "trialRunsCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trialRunsRequired" INTEGER NOT NULL DEFAULT 3,
ALTER COLUMN "status" SET DEFAULT 'trial';

-- AlterTable
ALTER TABLE "DispatchJob" ADD COLUMN     "doneChecklist" JSONB,
ADD COLUMN     "inspectorVerdict" JSONB;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "consentRevokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OpportunityCandidate" ADD COLUMN     "sourceSignals" JSONB;

-- CreateTable
CREATE TABLE "JobOutcome" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "baseline" JSONB,
    "hypothesis" TEXT,
    "result" JSONB NOT NULL,
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Touch" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded" BOOLEAN NOT NULL DEFAULT false,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Touch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobOutcome_jobId_key" ON "JobOutcome"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_externalId_key" ON "WebhookEvent"("provider", "externalId");

-- CreateIndex
CREATE INDEX "Touch_leadId_idx" ON "Touch"("leadId");

-- CreateIndex
CREATE INDEX "Touch_phase_idx" ON "Touch"("phase");

-- AddForeignKey
ALTER TABLE "JobOutcome" ADD CONSTRAINT "JobOutcome_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DispatchJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Touch" ADD CONSTRAINT "Touch_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

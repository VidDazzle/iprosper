-- CreateTable
CREATE TABLE "DispatchJob" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "task" JSONB NOT NULL,
    "budgetCap" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "costToDate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "leadId" TEXT,
    "invoicePaid" BOOLEAN NOT NULL DEFAULT false,
    "invoicePaidAt" TIMESTAMP(3),
    "revenueAttributed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineWeek" (
    "id" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "spend" DECIMAL(12,2) NOT NULL,
    "revenue" DECIMAL(12,2) NOT NULL,
    "roi" DECIMAL(8,4) NOT NULL,
    "consecutiveWinCycles" INTEGER NOT NULL DEFAULT 0,
    "consecutiveMissCycles" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngineWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "killedAt" TIMESTAMP(3),
    "killReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandKit" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "palette" TEXT[],
    "fonts" TEXT[],
    "logoUrl" TEXT,
    "services" TEXT[],
    "reviews" JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreviewResult" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "previewUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "voiceAgentId" TEXT,
    "watermarked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreviewResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "consentTimestamp" TIMESTAMP(3) NOT NULL,
    "consentText" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityCandidate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "estRevenueMonthly" DECIMAL(12,2) NOT NULL,
    "confidence" TEXT NOT NULL,
    "confidenceBasis" TEXT NOT NULL,
    "estBuildHours" DECIMAL(8,2) NOT NULL,
    "infraReuse" TEXT[],
    "score" DECIMAL(10,4) NOT NULL,
    "complianceFlags" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DispatchJob_source_idx" ON "DispatchJob"("source");

-- CreateIndex
CREATE INDEX "DispatchJob_engine_idx" ON "DispatchJob"("engine");

-- CreateIndex
CREATE INDEX "DispatchJob_agentId_idx" ON "DispatchJob"("agentId");

-- CreateIndex
CREATE INDEX "DispatchJob_status_idx" ON "DispatchJob"("status");

-- CreateIndex
CREATE INDEX "DispatchJob_createdAt_idx" ON "DispatchJob"("createdAt");

-- CreateIndex
CREATE INDEX "EngineWeek_engine_idx" ON "EngineWeek"("engine");

-- CreateIndex
CREATE UNIQUE INDEX "EngineWeek_engine_weekStart_key" ON "EngineWeek"("engine", "weekStart");

-- CreateIndex
CREATE INDEX "Agent_engine_idx" ON "Agent"("engine");

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "Agent"("status");

-- CreateIndex
CREATE INDEX "AuditLog_actor_idx" ON "AuditLog"("actor");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_target_idx" ON "AuditLog"("target");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrandKit_jobId_key" ON "BrandKit"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "PreviewResult_jobId_key" ON "PreviewResult"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_jobId_key" ON "Lead"("jobId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_consentTimestamp_idx" ON "Lead"("consentTimestamp");

-- CreateIndex
CREATE INDEX "OpportunityCandidate_status_idx" ON "OpportunityCandidate"("status");

-- CreateIndex
CREATE INDEX "OpportunityCandidate_score_idx" ON "OpportunityCandidate"("score");

-- AddForeignKey
ALTER TABLE "BrandKit" ADD CONSTRAINT "BrandKit_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DispatchJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreviewResult" ADD CONSTRAINT "PreviewResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DispatchJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DispatchJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

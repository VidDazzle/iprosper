-- CreateTable
CREATE TABLE "MockSite" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "html" TEXT,
    "generatedLive" BOOLEAN NOT NULL DEFAULT false,
    "groundingWarnings" TEXT[],
    "siteUrl" TEXT,
    "deployId" TEXT,
    "deployedLive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MockSite_jobId_key" ON "MockSite"("jobId");

-- AddForeignKey
ALTER TABLE "MockSite" ADD CONSTRAINT "MockSite_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DispatchJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

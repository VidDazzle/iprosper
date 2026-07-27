-- CreateTable
CREATE TABLE "MediaLicense" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "assetUrl" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "licenseType" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaLicense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaLicense_licenseId_key" ON "MediaLicense"("licenseId");

-- CreateIndex
CREATE INDEX "MediaLicense_assetUrl_idx" ON "MediaLicense"("assetUrl");

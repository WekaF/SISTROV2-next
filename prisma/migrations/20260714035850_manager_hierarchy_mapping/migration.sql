/*
  Warnings:

  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotificationSourceState` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "NotificationSourceState";

-- CreateTable
CREATE TABLE "VpRegion" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VpRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VpRegionWilayah" (
    "id" SERIAL NOT NULL,
    "vpRegionId" INTEGER NOT NULL,
    "wilayahCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VpRegionWilayah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerScope" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "wilayahCode" TEXT,
    "vpRegionId" INTEGER,
    "companyCode" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerScope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VpRegion_name_key" ON "VpRegion"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VpRegionWilayah_wilayahCode_key" ON "VpRegionWilayah"("wilayahCode");

-- CreateIndex
CREATE INDEX "VpRegionWilayah_vpRegionId_idx" ON "VpRegionWilayah"("vpRegionId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerScope_userId_key" ON "ManagerScope"("userId");

-- CreateIndex
CREATE INDEX "ManagerScope_tier_idx" ON "ManagerScope"("tier");

-- CreateIndex
CREATE INDEX "ManagerScope_vpRegionId_idx" ON "ManagerScope"("vpRegionId");

-- AddForeignKey
ALTER TABLE "VpRegionWilayah" ADD CONSTRAINT "VpRegionWilayah_vpRegionId_fkey" FOREIGN KEY ("vpRegionId") REFERENCES "VpRegion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerScope" ADD CONSTRAINT "ManagerScope_vpRegionId_fkey" FOREIGN KEY ("vpRegionId") REFERENCES "VpRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

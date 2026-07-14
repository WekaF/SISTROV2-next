-- DropForeignKey
ALTER TABLE "ManagerScope" DROP CONSTRAINT "ManagerScope_vpRegionId_fkey";

-- DropForeignKey
ALTER TABLE "VpRegionWilayah" DROP CONSTRAINT "VpRegionWilayah_vpRegionId_fkey";

-- DropTable
DROP TABLE "ManagerScope";

-- DropTable
DROP TABLE "VpRegionWilayah";

-- DropTable
DROP TABLE "VpRegion";

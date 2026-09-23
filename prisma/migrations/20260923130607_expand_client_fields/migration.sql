-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('PERSON', 'BUSINESS');

-- CreateEnum
CREATE TYPE "LegalStructure" AS ENUM ('SOLE_PROPRIETORSHIP', 'LIMITED_LIABILITY', 'PUBLIC_LIMITED', 'NGO', 'OTHER');

-- AlterTable
ALTER TABLE "SDClient" ADD COLUMN     "businessNature" TEXT,
ADD COLUMN     "clientType" "ClientType" NOT NULL DEFAULT 'PERSON',
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "legalStructure" "LegalStructure",
ADD COLUMN     "otherLegalStructure" TEXT,
ADD COLUMN     "registrationDate" TEXT,
ADD COLUMN     "tin" TEXT,
ADD COLUMN     "tradingName" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "channel" SET DEFAULT 'RETAIL',
ALTER COLUMN "shopId" SET DEFAULT 'ALL';

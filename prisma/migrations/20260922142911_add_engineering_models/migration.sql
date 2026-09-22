-- CreateTable
CREATE TABLE "EngProject" (
    "id" TEXT NOT NULL,
    "projectNumber" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientContact" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUOTED',
    "quotationRef" TEXT,
    "lpoRef" TEXT,
    "invoiceRef" TEXT,
    "location" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngTransaction" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expenditureCategory" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "isInternalSupply" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EngProject_projectNumber_key" ON "EngProject"("projectNumber");

-- AddForeignKey
ALTER TABLE "EngTransaction" ADD CONSTRAINT "EngTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "EngProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

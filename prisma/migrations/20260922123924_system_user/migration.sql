/*
  Warnings:

  - The values [MANAGING_DIRECTOR,SYSTEM_ADMIN,FINANCE_MANAGER,ACCOUNTANT,OPERATIONS_MANAGER,STORE_MANAGER,PROCUREMENT_OFFICER,SALES_OFFICER,HR_ADMIN,DEPARTMENT_MANAGER,STAFF,STOREKEEPER,AUDITOR,APPROVER,VIEWER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'FINANCE', 'RETAILER', 'WHOLESALE', 'ENGINEER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'ENGINEER';
COMMIT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'ENGINEER';

-- CreateTable
CREATE TABLE "FinanceAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "isSubLedger" BOOLEAN NOT NULL DEFAULT false,
    "accountNumber" TEXT,
    "bankName" TEXT,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTransaction" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceAccountId" TEXT NOT NULL,
    "destinationAccountId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "expenditureCodeId" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenditureCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenditureCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debtor" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "capital" DOUBLE PRECISION NOT NULL,
    "interest" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "dueDate" TEXT NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Debtor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtorPaymentRecord" (
    "id" TEXT NOT NULL,
    "debtorId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "accountId" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtorPaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creditor" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "dueDate" TEXT NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Creditor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditorPaymentRecord" (
    "id" TEXT NOT NULL,
    "creditorId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "accountId" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditorPaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "acquisitionDate" TEXT NOT NULL,
    "purchaseValue" DOUBLE PRECISION NOT NULL,
    "currentValuation" DOUBLE PRECISION NOT NULL,
    "location" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceAccount_code_key" ON "FinanceAccount"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenditureCode_code_key" ON "ExpenditureCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FixedAsset_code_key" ON "FixedAsset"("code");

-- AddForeignKey
ALTER TABLE "DebtorPaymentRecord" ADD CONSTRAINT "DebtorPaymentRecord_debtorId_fkey" FOREIGN KEY ("debtorId") REFERENCES "Debtor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditorPaymentRecord" ADD CONSTRAINT "CreditorPaymentRecord_creditorId_fkey" FOREIGN KEY ("creditorId") REFERENCES "Creditor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "SDShop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sellerName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SDShop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SDCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDAttributeTemplate" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SDAttributeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDProduct" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "attributeValues" JSONB NOT NULL,
    "unit" TEXT NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SDProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDPurchase" (
    "id" TEXT NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SDPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDPurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SDPurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDSale" (
    "id" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "profitMargin" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "amountOwed" DOUBLE PRECISION NOT NULL,
    "financeDebtorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SDSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDSaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "profitMargin" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SDSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "totalPurchased" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountOwed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SDClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SDCategory_code_key" ON "SDCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SDAttributeTemplate_categoryId_key" ON "SDAttributeTemplate"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SDProduct_code_key" ON "SDProduct"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SDPurchase_purchaseNumber_key" ON "SDPurchase"("purchaseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SDSale_saleNumber_key" ON "SDSale"("saleNumber");

-- AddForeignKey
ALTER TABLE "SDAttributeTemplate" ADD CONSTRAINT "SDAttributeTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SDCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SDPurchaseItem" ADD CONSTRAINT "SDPurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "SDPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SDSaleItem" ADD CONSTRAINT "SDSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "SDSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

import { Response } from "express";
import { prisma } from "../prisma.js";
import { AuthenticatedRequest } from "../middlewares/auth.js";

// Helper for shop scoping
function getScopedShopId(req: AuthenticatedRequest, queryShopId?: string): string | undefined {
  const user = req.user;
  if (!user) return queryShopId === "ALL" ? undefined : queryShopId;

  // Admin and Super Admin can view all or filter by queryShopId
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
    if (!queryShopId || queryShopId === "ALL") return undefined;
    return queryShopId;
  }

  // Retailer defaults to retail shop or query if specific
  if (user.role === "RETAILER") {
    if (queryShopId && queryShopId !== "ALL") return queryShopId;
    return "shop-gikondo";
  }

  // Wholesale defaults to wholesale hub
  if (user.role === "WHOLESALE") {
    return "shop-wholesale-hub";
  }

  if (!queryShopId || queryShopId === "ALL") return undefined;
  return queryShopId;
}

// ---------------------------------------------------------------------------
// 1. SHOPS
// ---------------------------------------------------------------------------

export async function getShops(_req: AuthenticatedRequest, res: Response) {
  try {
    const shops = await prisma.sDShop.findMany({
      orderBy: { name: "asc" },
    });
    return res.json(shops);
  } catch (error) {
    console.error("getShops error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 2. CATEGORIES & ATTRIBUTE TEMPLATES
// ---------------------------------------------------------------------------

export async function getCategories(_req: AuthenticatedRequest, res: Response) {
  try {
    const categories = await prisma.sDCategory.findMany({
      orderBy: { name: "asc" },
    });
    return res.json(categories);
  } catch (error) {
    console.error("getCategories error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAttributeTemplates(_req: AuthenticatedRequest, res: Response) {
  try {
    const templates = await prisma.sDAttributeTemplate.findMany();
    return res.json(templates);
  } catch (error) {
    console.error("getAttributeTemplates error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 3. PRODUCTS & DERIVED STOCK ON HAND
// ---------------------------------------------------------------------------

export async function getProducts(req: AuthenticatedRequest, res: Response) {
  try {
    const shopId = getScopedShopId(req, req.query.shopId as string);
    const where: any = {};
    if (shopId) where.shopId = shopId;

    const products = await prisma.sDProduct.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return res.json(products);
  } catch (error) {
    console.error("getProducts error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const { code, name, categoryId, categoryName, attributeValues, unit, purchasePrice, sellingPrice, shopId } = req.body;
    if (!code || !name || !categoryId || !shopId) {
      return res.status(400).json({ error: "Code, name, category, and shop are required" });
    }

    const newProduct = await prisma.sDProduct.create({
      data: {
        code,
        name,
        categoryId,
        categoryName: categoryName || "Hardware",
        attributeValues: attributeValues || {},
        unit: unit || "Pcs",
        purchasePrice: Number(purchasePrice || 0),
        sellingPrice: Number(sellingPrice || 0),
        shopId,
      },
    });

    return res.status(201).json(newProduct);
  } catch (error) {
    console.error("createProduct error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Helper function to derive stock on hand dynamically: sum(purchases) - sum(sales)
async function computeProductStock(productId: string, shopId?: string) {
  const product = await prisma.sDProduct.findUnique({ where: { id: productId } });
  if (!product) return null;

  const purchaseWhere: any = { items: { some: { productId } } };
  const saleWhere: any = { items: { some: { productId } } };
  if (shopId) {
    purchaseWhere.shopId = shopId;
    saleWhere.shopId = shopId;
  }

  const purchases = await prisma.sDPurchase.findMany({
    where: purchaseWhere,
    include: { items: true },
  });

  const sales = await prisma.sDSale.findMany({
    where: saleWhere,
    include: { items: true },
  });

  let totalPurchasedQty = 0;
  for (const p of purchases) {
    for (const item of p.items) {
      if (item.productId === productId) totalPurchasedQty += item.quantity;
    }
  }

  let totalSoldQty = 0;
  for (const s of sales) {
    for (const item of s.items) {
      if (item.productId === productId) totalSoldQty += item.quantity;
    }
  }

  const stockOnHand = Math.max(0, totalPurchasedQty - totalSoldQty);

  return {
    product,
    totalPurchasedQty,
    totalSoldQty,
    stockOnHand,
    stockValuationAtCost: stockOnHand * product.purchasePrice,
    stockValuationAtSelling: stockOnHand * product.sellingPrice,
  };
}

export async function getProductStockInfo(req: AuthenticatedRequest, res: Response) {
  try {
    const productId = req.params.productId as string;
    const shopId = getScopedShopId(req, req.query.shopId as string);
    const stockInfo = await computeProductStock(productId, shopId);
    if (!stockInfo) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.json(stockInfo);
  } catch (error) {
    console.error("getProductStockInfo error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAllProductsStockInfo(req: AuthenticatedRequest, res: Response) {
  try {
    const shopId = getScopedShopId(req, req.query.shopId as string);
    const where: any = {};
    if (shopId) where.shopId = shopId;

    const products = await prisma.sDProduct.findMany({ where });
    const stockInfoList = [];

    for (const prod of products) {
      const info = await computeProductStock(prod.id, shopId);
      if (info) stockInfoList.push(info);
    }

    return res.json(stockInfoList);
  } catch (error) {
    console.error("getAllProductsStockInfo error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 4. PURCHASES (Restocking)
// ---------------------------------------------------------------------------

export async function getPurchases(req: AuthenticatedRequest, res: Response) {
  try {
    const shopId = getScopedShopId(req, req.query.shopId as string);
    const where: any = {};
    if (shopId) where.shopId = shopId;

    const purchases = await prisma.sDPurchase.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(purchases);
  } catch (error) {
    console.error("getPurchases error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createPurchase(req: AuthenticatedRequest, res: Response) {
  try {
    const { date, shopId, supplierName, items, notes } = req.body;
    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Shop ID and purchase items are required" });
    }

    const products = await prisma.sDProduct.findMany({
      where: { id: { in: items.map((i: any) => i.productId) } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const formattedItems = items.map((i: any) => {
      const prod = productMap.get(i.productId);
      const quantity = Number(i.quantity);
      const unitPrice = Number(i.unitPrice);
      return {
        productId: i.productId,
        productName: prod ? prod.name : "Hardware Product",
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      };
    });

    const totalQuantity = formattedItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalAmount = formattedItems.reduce((sum, i) => sum + i.total, 0);

    const newPurchase = await prisma.sDPurchase.create({
      data: {
        purchaseNumber: `PUR-${Date.now().toString().slice(-5)}`,
        date: date || new Date().toISOString().slice(0, 10),
        shopId,
        supplierName: supplierName || "Supplier",
        totalQuantity,
        totalAmount,
        notes,
        items: {
          create: formattedItems,
        },
      },
      include: { items: true },
    });

    return res.status(201).json(newPurchase);
  } catch (error) {
    console.error("createPurchase error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 5. SALES & POS (Wired directly to Finance Debtors entity)
// ---------------------------------------------------------------------------

export async function getSales(req: AuthenticatedRequest, res: Response) {
  try {
    const shopId = getScopedShopId(req, req.query.shopId as string);
    const where: any = {};
    if (shopId) where.shopId = shopId;

    const sales = await prisma.sDSale.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(sales);
  } catch (error) {
    console.error("getSales error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createSale(req: AuthenticatedRequest, res: Response) {
  try {
    const { date, clientId, channel, shopId, items, amountPaid, notes } = req.body;
    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Shop ID and sale items are required" });
    }

    const client = clientId ? await prisma.sDClient.findUnique({ where: { id: clientId } }) : null;
    const clientName = client ? client.name : "Walk-in Counter Client";
    const clientPhone = client ? client.phone : "+250 788 000 000";

    const products = await prisma.sDProduct.findMany({
      where: { id: { in: items.map((i: any) => i.productId) } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const formattedItems = items.map((i: any) => {
      const prod = productMap.get(i.productId);
      const quantity = Number(i.quantity);
      const unitPrice = Number(i.unitPrice);
      const unitCost = prod ? prod.purchasePrice : 0;
      const total = quantity * unitPrice;
      const profitMargin = total - (quantity * unitCost);
      return {
        productId: i.productId,
        productName: prod ? prod.name : "Hardware Product",
        quantity,
        unitPrice,
        unitCost,
        total,
        profitMargin,
      };
    });

    const totalQuantity = formattedItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalAmount = formattedItems.reduce((sum, i) => sum + i.total, 0);
    const totalCost = formattedItems.reduce((sum, i) => sum + i.unitCost * i.quantity, 0);
    const profitMargin = totalAmount - totalCost;
    const paid = Number(amountPaid || 0);
    const amountOwed = Math.max(0, totalAmount - paid);

    let financeDebtorId: string | undefined = undefined;

    // STEP 3: INTEGRATION WITH FINANCE DEBTORS ENTITY
    // If credit is extended (amountOwed > 0), create a record in the same Finance Debtor table!
    if (amountOwed > 0) {
      const itemDesc = formattedItems.map((i) => `${i.productName} (x${i.quantity})`).join(", ");
      const financeDebtor = await prisma.debtor.create({
        data: {
          date: date || new Date().toISOString().slice(0, 10),
          customerName: clientName,
          item: `Supplier & Distribution Credit Sale: ${itemDesc}`,
          phoneNumber: clientPhone,
          interestRate: 0,
          capital: amountOwed,
          interest: 0,
          total: amountOwed,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          amountPaid: 0,
          status: "UNPAID",
          notes: `Credit Sale ${channel || "RETAIL"} — ${shopId}`,
        },
      });
      financeDebtorId = financeDebtor.id;
    }

    // Update Client balance in SDClient
    if (clientId) {
      await prisma.sDClient.updateMany({
        where: { id: clientId },
        data: {
          totalPurchased: { increment: totalAmount },
          amountOwed: { increment: amountOwed },
        },
      });
    }

    const newSale = await prisma.sDSale.create({
      data: {
        saleNumber: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        date: date || new Date().toISOString().slice(0, 10),
        clientId: clientId || "",
        clientName,
        channel: channel || "RETAIL",
        shopId,
        totalQuantity,
        totalAmount,
        totalCost,
        profitMargin,
        amountPaid: paid,
        amountOwed,
        financeDebtorId,
        notes,
        items: {
          create: formattedItems,
        },
      },
      include: { items: true },
    });

    return res.status(201).json(newSale);
  } catch (error) {
    console.error("createSale error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 6. CLIENTS
// ---------------------------------------------------------------------------

export async function getClients(req: AuthenticatedRequest, res: Response) {
  try {
    const shopId = getScopedShopId(req, req.query.shopId as string);
    const where: any = {};
    if (shopId) where.shopId = shopId;

    const clients = await prisma.sDClient.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return res.json(clients);
  } catch (error) {
    console.error("getClients error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createClient(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, phone, email, address, channel, shopId } = req.body;
    if (!name || !phone || !shopId) {
      return res.status(400).json({ error: "Client name, phone, and shop ID are required" });
    }

    const newClient = await prisma.sDClient.create({
      data: {
        name,
        phone,
        email: email || "",
        address: address || "",
        channel: channel || "RETAIL",
        shopId,
        totalPurchased: 0,
        amountOwed: 0,
      },
    });

    return res.status(201).json(newClient);
  } catch (error) {
    console.error("createClient error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 7. SUMMARY METRICS & ANALYTICS
// ---------------------------------------------------------------------------

export async function getSummaryMetrics(req: AuthenticatedRequest, res: Response) {
  try {
    const shopId = getScopedShopId(req, req.query.shopId as string);
    const where: any = {};
    if (shopId) where.shopId = shopId;

    const products = await prisma.sDProduct.findMany({ where });
    const sales = await prisma.sDSale.findMany({ where });
    const purchases = await prisma.sDPurchase.findMany({ where });
    const clients = await prisma.sDClient.findMany({ where });

    let totalStockValuationAtCost = 0;
    for (const prod of products) {
      const info = await computeProductStock(prod.id, shopId);
      if (info) totalStockValuationAtCost += info.stockValuationAtCost;
    }

    const totalSalesRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfitMargin = sales.reduce((sum, s) => sum + s.profitMargin, 0);
    const totalDebtorsOwed = clients.reduce((sum, c) => sum + c.amountOwed, 0);
    const totalPurchasesCost = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

    const retailSalesCount = sales.filter((s) => s.channel === "RETAIL").length;
    const wholesaleSalesCount = sales.filter((s) => s.channel === "WHOLESALE").length;

    return res.json({
      activeProductsCount: products.length,
      totalSalesRevenue,
      totalProfitMargin,
      totalStockValuationAtCost,
      totalDebtorsOwed,
      totalPurchasesCost,
      retailSalesCount,
      wholesaleSalesCount,
    });
  } catch (error) {
    console.error("getSummaryMetrics error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

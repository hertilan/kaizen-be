import { Options } from "swagger-jsdoc";

export const swaggerOptions: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Kaizen ERP API Documentation",
      version: "1.0.0",
      description:
        "Comprehensive RESTful API documentation for Kaizen ERP Backend System (SanTech).\n\nIncludes Authentication, User Management, Inventory (Products & Categories), Procurement (Suppliers & Purchases), Stock Control & Alerts, Finance (Invoices, Expenses & Payments), and Tasks Workflow.",
      contact: {
        name: "SanTech Development Team",
        email: "support@santech.rw",
      },
    },
    servers: [
      {
        url: "http://localhost:4000/api",
        description: "Local Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT Bearer token obtained from `/auth/login`",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            userId: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            role: { type: "string" },
            active: { type: "boolean" },
            avatarUrl: { type: "string", nullable: true },
          },
        },
        Category: {
          type: "object",
          properties: {
            categoryId: { type: "string", format: "uuid" },
            name: { type: "string" },
            parentCategoryId: { type: "string", format: "uuid", nullable: true },
          },
        },
        Product: {
          type: "object",
          properties: {
            productId: { type: "string", format: "uuid" },
            code: { type: "string" },
            name: { type: "string" },
            categoryId: { type: "string", format: "uuid" },
            unit: { type: "string" },
            purchasePrice: { type: "number" },
            sellingPrice: { type: "number" },
            stockQty: { type: "integer" },
            reorderLevel: { type: "integer" },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
          },
        },
        Supplier: {
          type: "object",
          properties: {
            supplierId: { type: "string", format: "uuid" },
            name: { type: "string" },
            contactPerson: { type: "string" },
            phone: { type: "string" },
            email: { type: "string" },
            address: { type: "string" },
            productsSupplied: { type: "array", items: { type: "string" } },
          },
        },
        Purchase: {
          type: "object",
          properties: {
            purchaseId: { type: "string", format: "uuid" },
            purchaseNumber: { type: "string" },
            supplierId: { type: "string", format: "uuid" },
            paymentStatus: { type: "string", enum: ["PAID", "PARTIAL", "UNPAID"] },
            notes: { type: "string", nullable: true },
          },
        },
        StockTransaction: {
          type: "object",
          properties: {
            transactionId: { type: "string", format: "uuid" },
            productId: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["STOCK_IN", "STOCK_OUT", "ADJUSTMENT", "TRANSFER"] },
            quantity: { type: "integer" },
            reference: { type: "string" },
            reason: { type: "string", nullable: true },
            date: { type: "string", format: "date-time" },
          },
        },
        AlertItem: {
          type: "object",
          properties: {
            alertId: { type: "string", format: "uuid" },
            productId: { type: "string", format: "uuid" },
            kind: { type: "string", enum: ["LOW_STOCK", "OUT_OF_STOCK", "ADJUSTMENT"] },
            message: { type: "string" },
            date: { type: "string", format: "date-time" },
          },
        },
        Invoice: {
          type: "object",
          properties: {
            invoiceId: { type: "string", format: "uuid" },
            invoiceNumber: { type: "string" },
            customerName: { type: "string" },
            dueDate: { type: "string", format: "date-time" },
            status: { type: "string", enum: ["PAID", "PARTIAL", "UNPAID"] },
            notes: { type: "string", nullable: true },
          },
        },
        Expense: {
          type: "object",
          properties: {
            expenseId: { type: "string", format: "uuid" },
            category: { type: "string" },
            description: { type: "string" },
            amount: { type: "number" },
            paymentMethod: { type: "string", enum: ["CASH", "MOBILE_MONEY", "BANK_TRANSFER"] },
            responsiblePerson: { type: "string" },
            date: { type: "string", format: "date-time" },
          },
        },
        Payment: {
          type: "object",
          properties: {
            paymentId: { type: "string", format: "uuid" },
            direction: { type: "string", enum: ["IN", "OUT"] },
            method: { type: "string", enum: ["CASH", "MOBILE_MONEY", "BANK_TRANSFER"] },
            amount: { type: "number" },
            reference: { type: "string" },
            notes: { type: "string", nullable: true },
            date: { type: "string", format: "date-time" },
          },
        },
        Task: {
          type: "object",
          properties: {
            taskId: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string", nullable: true },
            status: {
              type: "string",
              enum: [
                "NOT_STARTED",
                "IN_PROGRESS",
                "ON_HOLD",
                "PENDING_APPROVAL",
                "COMPLETED",
                "CANCELLED",
              ],
            },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
            assigneeId: { type: "string", format: "uuid" },
            department: { type: "string" },
            startDate: { type: "string", format: "date-time" },
            dueDate: { type: "string", format: "date-time" },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication & User Profile" },
      { name: "Users", description: "Admin User Management" },
      { name: "Categories", description: "Product Category Hierarchy" },
      { name: "Products", description: "Product Catalog Management" },
      { name: "Suppliers", description: "Supplier Directory" },
      { name: "Purchases", description: "Purchase Orders & Procurement" },
      { name: "Stock", description: "Stock Movements & Inventory Alerts" },
      { name: "Invoices", description: "Billing & Customer Invoices" },
      { name: "Expenses", description: "Company Expense Records" },
      { name: "Payments", description: "Payment Transactions (IN/OUT)" },
      { name: "Tasks", description: "Task & Workflow Management" },
    ],
  },
  apis: ["./src/routes/*.ts", "./dist/routes/*.js"],
};

import { Options } from "swagger-jsdoc";

export const swaggerOptions: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Kaizen ERP API Documentation",
      version: "1.0.0",
      description:
        "Comprehensive RESTful API documentation for Kaizen ERP Backend System (SanTech).\n\n" +
        "Includes Authentication, User Management, Inventory (Products & Categories), Procurement (Suppliers & Purchases), " +
        "Stock Control & Alerts, Finance (Invoices, Expenses & Payments), and Tasks Workflow.",
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
    paths: {
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "User Login",
          description: "Authenticate user with email and password to receive JWT token",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", example: "yvette@santech.rw" },
                    password: { type: "string", example: "Password123!" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Login successful (returns token & user profile)" },
            401: { description: "Invalid credentials" },
          },
        },
      },
      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get Current Logged-in User Profile",
          responses: {
            200: { description: "Returns logged-in user details" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/users": {
        get: {
          tags: ["Users"],
          summary: "Get All Users (Admin)",
          responses: {
            200: { description: "List of system users" },
          },
        },
        post: {
          tags: ["Users"],
          summary: "Create New User (Admin)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "password", "role"],
                  properties: {
                    name: { type: "string", example: "John Doe" },
                    email: { type: "string", example: "john@santech.rw" },
                    password: { type: "string", example: "Password123!" },
                    role: { type: "string", example: "STAFF" },
                    active: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "User created" },
          },
        },
      },
      "/users/{userId}": {
        put: {
          tags: ["Users"],
          summary: "Update User (Admin)",
          parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    email: { type: "string" },
                    role: { type: "string" },
                    active: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "User updated" } },
        },
      },
      "/categories": {
        get: {
          tags: ["Categories"],
          summary: "List All Categories",
          responses: { 200: { description: "List of categories" } },
        },
        post: {
          tags: ["Categories"],
          summary: "Create Category / Subcategory",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", example: "Solar Panels" },
                    parentCategoryId: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Category created" } },
        },
      },
      "/categories/{categoryId}": {
        get: {
          tags: ["Categories"],
          summary: "Get Category Details",
          parameters: [{ name: "categoryId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Category details" } },
        },
        put: {
          tags: ["Categories"],
          summary: "Update Category",
          parameters: [{ name: "categoryId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { name: { type: "string" }, parentCategoryId: { type: "string" } },
                },
              },
            },
          },
          responses: { 200: { description: "Category updated" } },
        },
        delete: {
          tags: ["Categories"],
          summary: "Delete Category",
          parameters: [{ name: "categoryId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Category deleted" } },
        },
      },
      "/products": {
        get: {
          tags: ["Products"],
          summary: "List Products with Search & Filters",
          parameters: [
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "categoryId", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } },
          ],
          responses: { 200: { description: "List of products" } },
        },
        post: {
          tags: ["Products"],
          summary: "Create New Product",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["code", "name", "categoryId", "unit", "purchasePrice", "sellingPrice"],
                  properties: {
                    code: { type: "string", example: "SLR-300W" },
                    name: { type: "string", example: "Solar Panel 300W" },
                    categoryId: { type: "string" },
                    unit: { type: "string", example: "Pcs" },
                    purchasePrice: { type: "number", example: 120.0 },
                    sellingPrice: { type: "number", example: 180.0 },
                    stockQty: { type: "integer", example: 25 },
                    reorderLevel: { type: "integer", example: 10 },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Product created" } },
        },
      },
      "/products/{productId}": {
        get: {
          tags: ["Products"],
          summary: "Get Product Details",
          parameters: [{ name: "productId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Product details" } },
        },
        put: {
          tags: ["Products"],
          summary: "Update Product",
          parameters: [{ name: "productId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    sellingPrice: { type: "number" },
                    purchasePrice: { type: "number" },
                    stockQty: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Product updated" } },
        },
        delete: {
          tags: ["Products"],
          summary: "Delete Product",
          parameters: [{ name: "productId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Product deleted" } },
        },
      },
      "/suppliers": {
        get: {
          tags: ["Suppliers"],
          summary: "List Suppliers",
          parameters: [{ name: "search", in: "query", schema: { type: "string" } }],
          responses: { 200: { description: "List of suppliers" } },
        },
        post: {
          tags: ["Suppliers"],
          summary: "Create Supplier",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "contactPerson", "phone", "email", "address"],
                  properties: {
                    name: { type: "string", example: "Kigali Hardware Supplies Ltd" },
                    contactPerson: { type: "string", example: "Jean Bosco" },
                    phone: { type: "string", example: "+250 788 123 456" },
                    email: { type: "string", example: "sales@kigalihardware.rw" },
                    address: { type: "string", example: "Nyabugogo, Kigali" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Supplier created" } },
        },
      },
      "/suppliers/{supplierId}": {
        get: {
          tags: ["Suppliers"],
          summary: "Get Supplier Details",
          parameters: [{ name: "supplierId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Supplier details" } },
        },
        put: {
          tags: ["Suppliers"],
          summary: "Update Supplier",
          parameters: [{ name: "supplierId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: { type: "object", properties: { phone: { type: "string" }, email: { type: "string" } } },
              },
            },
          },
          responses: { 200: { description: "Supplier updated" } },
        },
        delete: {
          tags: ["Suppliers"],
          summary: "Delete Supplier",
          parameters: [{ name: "supplierId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Supplier deleted" } },
        },
      },
      "/purchases": {
        get: {
          tags: ["Purchases"],
          summary: "List Purchase Orders",
          parameters: [
            { name: "supplierId", in: "query", schema: { type: "string" } },
            { name: "paymentStatus", in: "query", schema: { type: "string", enum: ["PAID", "PARTIAL", "UNPAID"] } },
          ],
          responses: { 200: { description: "List of purchase orders" } },
        },
        post: {
          tags: ["Purchases"],
          summary: "Create Purchase Order & Auto Increment Stock",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["purchaseNumber", "supplierId", "items"],
                  properties: {
                    purchaseNumber: { type: "string", example: "PO-2026-001" },
                    supplierId: { type: "string" },
                    paymentStatus: { type: "string", example: "UNPAID" },
                    notes: { type: "string", example: "Stock replenishment" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["productId", "quantity", "unitPrice"],
                        properties: {
                          productId: { type: "string" },
                          quantity: { type: "integer", example: 10 },
                          unitPrice: { type: "number", example: 50.0 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Purchase order created" } },
        },
      },
      "/purchases/{purchaseId}": {
        get: {
          tags: ["Purchases"],
          summary: "Get Purchase Order Details",
          parameters: [{ name: "purchaseId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Purchase order details" } },
        },
        put: {
          tags: ["Purchases"],
          summary: "Update Purchase Order Status",
          parameters: [{ name: "purchaseId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    paymentStatus: { type: "string", enum: ["PAID", "PARTIAL", "UNPAID"] },
                    notes: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Purchase order updated" } },
        },
        delete: {
          tags: ["Purchases"],
          summary: "Delete Purchase Order",
          parameters: [{ name: "purchaseId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Purchase order deleted" } },
        },
      },
      "/stock/transactions": {
        get: {
          tags: ["Stock"],
          summary: "List Stock Movements & Adjustments",
          parameters: [
            { name: "productId", in: "query", schema: { type: "string" } },
            { name: "type", in: "query", schema: { type: "string", enum: ["STOCK_IN", "STOCK_OUT", "ADJUSTMENT", "TRANSFER"] } },
          ],
          responses: { 200: { description: "Stock movement logs" } },
        },
        post: {
          tags: ["Stock"],
          summary: "Record Stock Movement / Adjustment",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["productId", "type", "quantity", "reference"],
                  properties: {
                    productId: { type: "string" },
                    type: { type: "string", enum: ["STOCK_IN", "STOCK_OUT", "ADJUSTMENT", "TRANSFER"] },
                    quantity: { type: "integer", example: 5 },
                    reference: { type: "string", example: "REC-2026-10" },
                    reason: { type: "string", example: "Store dispatch" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Stock transaction recorded" } },
        },
      },
      "/stock/alerts": {
        get: {
          tags: ["Stock"],
          summary: "List Low Stock & Out of Stock Alerts",
          responses: { 200: { description: "Active inventory alerts" } },
        },
      },
      "/stock/alerts/{alertId}": {
        delete: {
          tags: ["Stock"],
          summary: "Dismiss Inventory Alert",
          parameters: [{ name: "alertId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Alert dismissed" } },
        },
      },
      "/invoices": {
        get: {
          tags: ["Invoices"],
          summary: "List Invoices",
          parameters: [
            { name: "status", in: "query", schema: { type: "string", enum: ["PAID", "PARTIAL", "UNPAID"] } },
            { name: "search", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "List of invoices" } },
        },
        post: {
          tags: ["Invoices"],
          summary: "Create Invoice",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["invoiceNumber", "customerName", "dueDate", "items"],
                  properties: {
                    invoiceNumber: { type: "string", example: "INV-2026-001" },
                    customerName: { type: "string", example: "Kigali Construction Co" },
                    dueDate: { type: "string", format: "date", example: "2026-10-01" },
                    status: { type: "string", example: "UNPAID" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["description", "quantity", "unitPrice"],
                        properties: {
                          description: { type: "string", example: "Solar Inverter 5kW" },
                          quantity: { type: "integer", example: 2 },
                          unitPrice: { type: "number", example: 450.0 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Invoice created" } },
        },
      },
      "/invoices/{invoiceId}": {
        get: {
          tags: ["Invoices"],
          summary: "Get Invoice Details",
          parameters: [{ name: "invoiceId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Invoice details" } },
        },
        put: {
          tags: ["Invoices"],
          summary: "Update Invoice",
          parameters: [{ name: "invoiceId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string" }, notes: { type: "string" } },
                },
              },
            },
          },
          responses: { 200: { description: "Invoice updated" } },
        },
        delete: {
          tags: ["Invoices"],
          summary: "Delete Invoice",
          parameters: [{ name: "invoiceId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Invoice deleted" } },
        },
      },
      "/expenses": {
        get: {
          tags: ["Expenses"],
          summary: "List Expenses",
          parameters: [
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "search", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "List of expenses" } },
        },
        post: {
          tags: ["Expenses"],
          summary: "Create Expense Record",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["category", "description", "amount", "paymentMethod", "responsiblePerson"],
                  properties: {
                    category: { type: "string", example: "TRANSPORT" },
                    description: { type: "string", example: "Truck fuel for site delivery" },
                    amount: { type: "number", example: 45.0 },
                    paymentMethod: { type: "string", example: "MOBILE_MONEY" },
                    responsiblePerson: { type: "string", example: "Jean Claude" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Expense created" } },
        },
      },
      "/expenses/{expenseId}": {
        get: {
          tags: ["Expenses"],
          summary: "Get Expense Details",
          parameters: [{ name: "expenseId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Expense details" } },
        },
        put: {
          tags: ["Expenses"],
          summary: "Update Expense Record",
          parameters: [{ name: "expenseId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: { type: "object", properties: { amount: { type: "number" }, description: { type: "string" } } },
              },
            },
          },
          responses: { 200: { description: "Expense updated" } },
        },
        delete: {
          tags: ["Expenses"],
          summary: "Delete Expense Record",
          parameters: [{ name: "expenseId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Expense deleted" } },
        },
      },
      "/payments": {
        get: {
          tags: ["Payments"],
          summary: "List Logged Payments",
          parameters: [
            { name: "direction", in: "query", schema: { type: "string", enum: ["IN", "OUT"] } },
            { name: "search", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "List of payments" } },
        },
        post: {
          tags: ["Payments"],
          summary: "Log Payment & Auto-update Status",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["direction", "method", "amount", "reference"],
                  properties: {
                    direction: { type: "string", example: "IN" },
                    method: { type: "string", example: "BANK_TRANSFER" },
                    amount: { type: "number", example: 300.0 },
                    reference: { type: "string", example: "INV-2026-001" },
                    notes: { type: "string", example: "Installment payment" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Payment logged and status updated" } },
        },
      },
      "/payments/{paymentId}": {
        get: {
          tags: ["Payments"],
          summary: "Get Payment Details",
          parameters: [{ name: "paymentId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Payment details" } },
        },
        delete: {
          tags: ["Payments"],
          summary: "Delete Payment Record",
          parameters: [{ name: "paymentId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Payment deleted" } },
        },
      },
      "/tasks": {
        get: {
          tags: ["Tasks"],
          summary: "List Tasks with Filters",
          parameters: [
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "priority", in: "query", schema: { type: "string" } },
            { name: "assigneeId", in: "query", schema: { type: "string" } },
            { name: "search", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "List of tasks" } },
        },
        post: {
          tags: ["Tasks"],
          summary: "Create Task",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "assigneeId", "department", "startDate", "dueDate"],
                  properties: {
                    title: { type: "string", example: "Site survey audit" },
                    description: { type: "string", example: "Evaluate electrical wiring" },
                    status: { type: "string", example: "NOT_STARTED" },
                    priority: { type: "string", example: "MEDIUM" },
                    assigneeId: { type: "string" },
                    department: { type: "string", example: "Operations" },
                    startDate: { type: "string", format: "date", example: "2026-09-15" },
                    dueDate: { type: "string", format: "date", example: "2026-09-22" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Task created" } },
        },
      },
      "/tasks/{taskId}": {
        get: {
          tags: ["Tasks"],
          summary: "Get Task Details, Comments & History",
          parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Task details" } },
        },
        put: {
          tags: ["Tasks"],
          summary: "Update Task & Auto Log History",
          parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "IN_PROGRESS" },
                    priority: { type: "string", example: "HIGH" },
                    assigneeId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Task updated" } },
        },
        delete: {
          tags: ["Tasks"],
          summary: "Delete Task",
          parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Task deleted" } },
        },
      },
      "/tasks/{taskId}/comments": {
        get: {
          tags: ["Tasks"],
          summary: "Get Task Comments",
          parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "List of task comments" } },
        },
        post: {
          tags: ["Tasks"],
          summary: "Add Comment to Task",
          parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message"],
                  properties: { message: { type: "string", example: "Site survey completed successfully." } },
                },
              },
            },
          },
          responses: { 201: { description: "Comment added" } },
        },
      },
    },
  },
  apis: [],
};

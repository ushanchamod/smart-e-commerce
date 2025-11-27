import { sql } from "drizzle-orm";
import { vector } from "drizzle-orm/pg-core";
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  index,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    userId: serial("user_id").primaryKey(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }),
    email: varchar("email", { length: 100 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    threadId: varchar("thread_id", { length: 255 })
      .notNull()
      .unique()
      .default(sql`gen_random_uuid()`),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    check("users_role_check", sql`${table.role} IN ('ADMIN', 'USER', 'GUEST')`),
  ]
);

export const categoriesTable = pgTable("categories", {
  categoryId: serial("category_id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const productsTable = pgTable(
  "products",
  {
    productId: serial("product_id").primaryKey(),
    name: varchar("name", { length: 150 }).notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    description: text("description"),
    image: varchar("image_url", { length: 255 }),
    categoryId: integer("category_id")
      .references(() => categoriesTable.categoryId)
      .notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [index("products_category_idx").on(table.categoryId)]
);

export const ordersTable = pgTable(
  "orders",
  {
    orderId: serial("order_id").primaryKey(),
    userId: integer("user_id")
      .references(() => usersTable.userId)
      .notNull(),
    address: text("address").notNull(),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    paymentMethod: varchar("payment_method", { length: 20 })
      .default("cod")
      .notNull(),
    status: varchar("status", { length: 50 }).default("PENDING").notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("orders_user_idx").on(table.userId),
    check(
      "orders_status_check",
      sql`${table.status} IN ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED')`
    ),
  ]
);

export const orderItemsTable = pgTable(
  "order_items",
  {
    orderItemId: serial("order_item_id").primaryKey(),
    orderId: integer("order_id")
      .references(() => ordersTable.orderId)
      .notNull(),
    productId: integer("product_id")
      .references(() => productsTable.productId)
      .notNull(),
    quantity: integer("quantity").default(1).notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    index("order_items_product_idx").on(table.productId),
  ]
);

export const cartItemsTable = pgTable(
  "cart_items",
  {
    cartItemId: serial("cart_item_id").primaryKey(),
    userId: integer("user_id")
      .references(() => usersTable.userId)
      .notNull(),
    productId: integer("product_id")
      .references(() => productsTable.productId)
      .notNull(),
    quantity: integer("quantity").default(1).notNull(),
    addedAt: timestamp("added_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("cart_user_idx").on(table.userId),
    index("cart_product_idx").on(table.productId),
  ]
);

export const paymentsTable = pgTable(
  "payments",
  {
    paymentId: serial("payment_id").primaryKey(),
    orderId: integer("order_id")
      .references(() => ordersTable.orderId)
      .notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
    paymentStatus: varchar("payment_status", { length: 20 })
      .default("PENDING")
      .notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    transactionId: varchar("transaction_id", { length: 255 }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    check(
      "payments_status_check",
      sql`${table.paymentStatus} IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')`
    ),
    check(
      "payments_method_check",
      sql`${table.paymentMethod} IN ('CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER', 'CASH_ON_DELIVERY')`
    ),
  ]
);

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  metadata: text("metadata"),
  embedding: vector("embedding", { dimensions: 1536 }),
});

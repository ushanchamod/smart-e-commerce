import { sql } from "drizzle-orm";
import { uuid } from "drizzle-orm/pg-core";
import { uniqueIndex } from "drizzle-orm/pg-core";
import { jsonb } from "drizzle-orm/pg-core";
import { bigint } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  pgTable,
  varchar,
  text,
  date,
  decimal,
  timestamp,
  index,
  check,
  integer,
} from "drizzle-orm/pg-core";

export const companiesTable = pgTable(
  "companies",
  {
    companyId: integer("company_id").primaryKey().generatedAlwaysAsIdentity(),
    companyName: varchar("company_name", { length: 100 }).notNull(),
    address: varchar("address", { length: 200 }),
    industry: varchar("industry", { length: 100 }),
    registeredDate: timestamp("registered_date").notNull(),
    financialYearStart: date("financial_year_start").notNull(),
    companyStatus: varchar("company_status", { length: 20 }).default("active"), // 'active', 'inactive'
    phone: varchar("phone", { length: 20 }).notNull().unique(),
    email: varchar("email", { length: 50 }).notNull().unique(),
    website: varchar("website", { length: 100 }).unique(),
    logo: varchar("logo", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("companies_company_name_idx").on(table.companyName),
    index("companies_email_idx").on(table.email),
    index("companies_phone_idx").on(table.phone),

    check(
      "company_status_check",
      sql`${table.companyStatus} IN ('active', 'inactive')`
    ),
  ]
);

export const usersTable = pgTable(
  "users",
  {
    userId: integer("user_id").primaryKey().generatedAlwaysAsIdentity(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull().unique(),
    email: varchar("email", { length: 100 }).notNull().unique(),
    companyId: integer("company_id").references(
      () => companiesTable.companyId,
      { onDelete: "cascade" }
    ),
    role: varchar("role", { length: 20 }).notNull(), // 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'STAFF'
    permissions: text("permissions")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    lastName: varchar("last_name", { length: 100 }),
    joinedDate: timestamp("joined_date"),
    salary: decimal("salary", { precision: 12, scale: 2 }),
    visaStartDate: timestamp("visa_start_date"),
    visaEndDate: timestamp("visa_end_date"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"), // for soft deletes
  },
  (table) => [
    index("users_company_id_idx").on(table.companyId),
    index("users_phone_idx").on(table.phone),
    index("users_username_idx").on(table.username),
    check(
      "visa_date_check",
      sql`(${table.visaStartDate} IS NULL OR ${table.visaEndDate} IS NULL OR ${table.visaEndDate} > ${table.visaStartDate})`
    ),
    check(
      "role_check",
      sql`${table.role} IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'STAFF', 'OWNER')`
    ),
  ]
);

export const userCredentialsTable = pgTable(
  "user_credentials",
  {
    credentialId: integer("credential_id")
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.userId, {
        onDelete: "cascade",
      }),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("user_credentials_user_id_idx").on(table.userId)]
);

export const expenseIncomeTypeTable = pgTable(
  "expense_income_type",
  {
    expenseIncomeTypeId: integer("expense_income_type_id")
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    description: text("description"),
    type: varchar("type", { length: 10 }).notNull(), // 'expense' or 'income'
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"), // Soft delete support
  },
  (table) => [
    index("expense_income_type_name_idx").on(table.name),
    check("type_check", sql`${table.type} IN ('expense', 'income')`),
  ]
);

export const transactionsTable = pgTable(
  "transactions",
  {
    transactionId: integer("transaction_id")
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    expenseIncomeTypeId: integer("expense_income_type_id")
      .notNull()
      .references(() => expenseIncomeTypeTable.expenseIncomeTypeId, {
        onDelete: "restrict",
      }),
    billNumber: varchar("bill_number", { length: 50 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    date: date("date").notNull(),
    description: text("description"),
    userId: integer("user_id").references(() => usersTable.userId, {
      onDelete: "set null",
    }),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.companyId, {
        onDelete: "cascade",
      }),
    attachment: varchar("attachment", { length: 255 }).default(sql`null`),
    readAt: timestamp("read_at"),
    readBy: jsonb("read_by")
      .$type<number[]>()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdBy: integer("created_by").references(() => usersTable.userId, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("transactions_user_id_idx").on(table.userId),
    index("transactions_company_id_idx").on(table.companyId),
    index("transactions_expense_income_type_id_idx").on(
      table.expenseIncomeTypeId
    ),
    index("transactions_date_idx").on(table.date),
    index("transactions_created_by_idx").on(table.createdBy),
    check("date_check", sql`${table.date} <= CURRENT_DATE`),
    check("amount_check", sql`${table.amount} > 0`),
  ]
);

export const draftTransactionsTable = pgTable(
  "draft_transactions",
  {
    draftTransactionId: integer("draft_transaction_id")
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    attachment: varchar("attachment", { length: 255 }),
    type: varchar("category", { length: 10 }).notNull(), // 'expense' or 'income'
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.companyId, {
        onDelete: "cascade",
      }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("draft_transactions_company_id_idx").on(table.companyId),
    check("category_check", sql`${table.type} IN ('expense', 'income')`),
  ]
);

export const companyEmployeesTable = pgTable(
  "company_employees",
  {
    employeeId: integer("employee_id").primaryKey().generatedAlwaysAsIdentity(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.companyId, {
        onDelete: "cascade",
      }),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }),
    email: varchar("email", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    position: varchar("position", { length: 100 }),
    salary: decimal("salary", { precision: 12, scale: 2 }),
    hiredDate: date("hired_date").notNull(),
    visaStartDate: date("visa_start_date"),
    visaEndDate: date("visa_end_date"),
    idImage: jsonb("id_image").$type<{ front: string; back: string }>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    visaExpiredReminderAt: timestamp("visa_expired_reminder_at"),
    readBy: jsonb("read_by")
      .$type<number[]>()
      .default(sql`'[]'::jsonb`),
  },
  (table) => [
    check("salary_check", sql`${table.salary} IS NULL OR ${table.salary} >= 0`),
    check(
      "visa_date_check",
      sql`(${table.visaStartDate} IS NULL OR ${table.visaEndDate} IS NULL OR ${table.visaEndDate} > ${table.visaStartDate})`
    ),
    index("company_employees_company_id_idx").on(table.companyId),
  ]
);

export const errorLogsTable = pgTable("error_logs", {
  logId: integer("log_id").primaryKey().generatedAlwaysAsIdentity(),
  message: text("message").notNull(),
  stack: text("stack"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: jsonb("context").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const folderTable = pgTable(
  "folders",
  {
    folderId: uuid("folder_id").defaultRandom().primaryKey(),
    folderName: varchar("name", { length: 255 }).notNull(),
    parentFolderId: uuid("parent_folder_id")
      .references((): AnyPgColumn => folderTable.folderId, {
        onDelete: "cascade",
      })
      .default(sql`null`),
    companyId: integer("company_id")
      .references(() => companiesTable.companyId, { onDelete: "cascade" })
      .default(sql`null`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("folders_company_id_idx").on(table.companyId),
    index("folders_parent_folder_id_idx").on(table.parentFolderId),

    uniqueIndex("unique_company_folder_name")
      .on(table.companyId, table.parentFolderId, table.folderName)
      .where(sql`${table.companyId} IS NOT NULL`),

    uniqueIndex("unique_admin_folder_name")
      .on(table.parentFolderId, table.folderName)
      .where(sql`${table.companyId} IS NULL`),
  ]
);

export const fileTable = pgTable(
  "files",
  {
    fileId: uuid("file_id").defaultRandom().primaryKey(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    r2ObjectKey: varchar("r2_object_key", { length: 1024 }).notNull().unique(),
    mimeType: varchar("mime_type", { length: 100 }),
    sizeBytes: bigint("size_bytes", { mode: "number" }),

    folderId: uuid("folder_id")
      .references(() => folderTable.folderId, {
        onDelete: "cascade",
      })
      .default(sql`null`),

    companyId: integer("company_id")
      .references(() => companiesTable.companyId, { onDelete: "cascade" })
      .default(sql`null`),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("files_company_id_idx").on(table.companyId),
    index("files_folder_id_idx").on(table.folderId),

    uniqueIndex("unique_company_file_name")
      .on(table.companyId, table.folderId, table.fileName)
      .where(sql`${table.companyId} IS NOT NULL`),

    uniqueIndex("unique_admin_file_name")
      .on(table.folderId, table.fileName)
      .where(sql`${table.companyId} IS NULL`),
  ]
);

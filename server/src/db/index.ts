import "dotenv/config";
import * as schema from "./schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: process.env.NODE_ENV === "production",
  },
});

export const db = drizzle(pool, { schema });

export async function testDbConnection() {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    console.log("✅ Database connected successfully!");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
}

export async function createOwnerIfNotExists() {
  const existingOwner = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.role, "OWNER"));

  if (existingOwner.length > 0) {
    console.log("✅ Owner account already exists. Skipping creation.");
    return true;
  }

  const newOwner = {
    email: "admin@local.com",
    phone: "1234567890",
    firstName: "Admin",
    role: "ADMIN" as const,
    passwordHash: process.env.ADMIN_HASH!,
  };

  try {
    await db.transaction(async (tx) => {
      const ownerResult = await tx
        .insert(schema.usersTable)
        .values(newOwner)
        .returning();

      if (ownerResult.length === 0) {
        throw new Error("Failed to create owner user");
      }

      return [ownerResult[0]];
    });

    console.log("✅ Owner account created successfully.");
    return true;
  } catch (error: unknown) {
    console.error("❌ Failed to create owner account:", error);
    return false;
  }
}

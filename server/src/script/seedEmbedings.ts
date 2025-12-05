import dotenv from "dotenv";
dotenv.config();

import { db } from "../db";
import { productsTable, categoriesTable } from "../db/schema";
import { eq, isNull } from "drizzle-orm";
import { OpenAIEmbeddings } from "@langchain/openai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("Missing API_KEY in env");
}

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  apiKey: API_KEY,
});

async function generateProductEmbeddings() {
  console.log("🚀 Starting Product Embedding Generation...");

  const products = await db
    .select({
      productId: productsTable.productId,
      name: productsTable.name,
      description: productsTable.description,
      categoryName: categoriesTable.name,
      categoryDescription: categoriesTable.description,
    })
    .from(productsTable)
    .innerJoin(
      categoriesTable,
      eq(productsTable.categoryId, categoriesTable.categoryId)
    )
    .where(isNull(productsTable.embedding));

  console.log(`📦 Found ${products.length} products to process.`);

  for (const product of products) {
    const textToEmbed = `
      Product: ${product.name}
      Category: ${product.categoryName}
      CategoryDescription: ${product.categoryDescription}
      Description: ${product.description}
    `.trim();

    try {
      const vector = await embeddings.embedQuery(textToEmbed);
      await db
        .update(productsTable)
        .set({ embedding: vector })
        .where(eq(productsTable.productId, product.productId));

      console.log(`DONE Updated: ${product.name}`);
    } catch (error) {
      console.error(`!!! Failed to embed ${product.name}:`, error);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log("DONE Embedding generation complete!");
  process.exit(0);
}

generateProductEmbeddings();

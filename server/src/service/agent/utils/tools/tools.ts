import dotenv from "dotenv";
dotenv.config();
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "../../../../db";
import {
  categoriesTable,
  documentsTable,
  orderItemsTable,
  ordersTable,
  productsTable,
} from "../../../../db/schema";
import {
  and,
  cosineDistance,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { RunnableConfig } from "@langchain/core/runnables";
import { embeddings } from "../../../embeddingService";

const CLIENT_URL = process.env.CORS_ORIGIN_CLIENT || "http://localhost:3000";

const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
  }).format(Number(amount));
};

export const getSomeProducts = tool(
  async () => {
    try {
      const products = await db
        .select({
          id: productsTable.productId,
          name: productsTable.name,
          price: productsTable.price,
          description: productsTable.description,
          image: productsTable.image,
          category: categoriesTable.name,
        })
        .from(productsTable)
        .innerJoin(
          categoriesTable,
          eq(productsTable.categoryId, categoriesTable.categoryId)
        )
        .orderBy(sql`RANDOM()`)
        .limit(5);

      const productsFormatted = products.map((product) => ({
        ...product,
        price: formatCurrency(product.price),
        product_path: `${CLIENT_URL}/product/${product.id}`,
      }));

      return JSON.stringify(productsFormatted);
    } catch (error) {
      return `Error fetching products: ${error}`;
    }
  },
  {
    name: "get-random-product-suggestions",
    description: `
    USE CASE: Open-ended discovery / Window shopping.
    TRIGGER: User asks "Show me something interesting", "What do you recommend?", or "Give me gift ideas" WITHOUT specific criteria.
    
    RESTRICTIONS:
    - DO NOT use if the user specifies a category (e.g., "flowers"), color, or price. Use 'search-products' for those.
    `,
    schema: z.object({}),
  }
);

export const getSpecificProduct = tool(
  async (inputs: { productId: string }) => {
    try {
      const rawId = inputs.productId.toString().trim();
      const id = parseInt(rawId);

      if (isNaN(id)) {
        return "Error: Invalid Product ID. The ID must be a numeric value.";
      }

      const product = await db
        .select({
          id: productsTable.productId,
          name: productsTable.name,
          price: productsTable.price,
          description: productsTable.description,
          image: productsTable.image,
          category: categoriesTable.name,
        })
        .from(productsTable)
        .innerJoin(
          categoriesTable,
          eq(productsTable.categoryId, categoriesTable.categoryId)
        )
        .where(eq(productsTable.productId, id))
        .limit(1)
        .then((res) => res[0] ?? null);

      if (!product) {
        return `Product with ID ${id} not found. It may have been removed or the ID is incorrect.`;
      }

      const productFormatted = {
        ...product,
        price: formatCurrency(product.price),
        product_path: `${CLIENT_URL}/product/${product.id}`,
      };

      return JSON.stringify(productFormatted);
    } catch (error) {
      return `Error fetching product: ${error}`;
    }
  },
  {
    name: "get-product-details",
    description: `
    USE CASE: Fetching full details for a SPECIFIC product by its ID.
    TRIGGER: User clicks a product link or asks "Tell me more about the red shoes" (where you already know the ID from context).
    
    CRITICAL RULES:
    1. You MUST have a valid numeric 'productId' from a previous search result.
    2. DO NOT GUESS IDs. If you don't know the ID, use 'search-products' to find it first.
    `,
    schema: z.object({
      productId: z
        .union([z.string(), z.number()])
        .describe("The unique numeric ID of the product"),
    }),
  }
);

export const searchProducts = tool(
  async (inputs: { query: string; minPrice?: number; maxPrice?: number }) => {
    const { query, minPrice, maxPrice } = inputs;

    if (!query || query.trim() === "") {
      return "Error: Search query cannot be empty.";
    }

    try {
      const queryVector = await embeddings.embedQuery(query.trim());

      const similarity = sql<number>`1 - (${cosineDistance(
        productsTable.embedding,
        queryVector
      )})`;

      const conditions = [];

      conditions.push(gt(similarity, 0.3));

      if (minPrice !== undefined) {
        conditions.push(gte(productsTable.price, minPrice.toString()));
      }
      if (maxPrice !== undefined) {
        conditions.push(lte(productsTable.price, maxPrice.toString()));
      }

      const products = await db
        .select({
          id: productsTable.productId,
          name: productsTable.name,
          price: productsTable.price,
          description: productsTable.description,
          image: productsTable.image,
          category: categoriesTable.name,
          score: similarity,
        })
        .from(productsTable)
        .innerJoin(
          categoriesTable,
          eq(productsTable.categoryId, categoriesTable.categoryId)
        )
        .where(and(...conditions))
        .orderBy(desc(similarity))
        .limit(8);

      if (products.length === 0) {
        console.log(
          "⚠️ Vector search yielded 0 results, attempting text fallback..."
        );

        const textConditions = [
          or(
            ilike(productsTable.name, `%${query}%`),
            ilike(categoriesTable.name, `%${query}%`)
          ),
        ];
        if (maxPrice)
          textConditions.push(lte(productsTable.price, maxPrice.toString()));

        const fallbackProducts = await db
          .select({
            id: productsTable.productId,
            name: productsTable.name,
            price: productsTable.price,
            category: categoriesTable.name,
          })
          .from(productsTable)
          .innerJoin(
            categoriesTable,
            eq(productsTable.categoryId, categoriesTable.categoryId)
          )
          .where(and(...textConditions))
          .limit(5);

        if (fallbackProducts.length === 0) {
          return "No products found matching that query and price range.";
        }

        const formattedFallback = fallbackProducts.map((p) => ({
          ...p,
          price: formatCurrency(p.price),
          product_path: `${CLIENT_URL}/product/${p.id}`,
          match_type: "keyword_fallback",
        }));

        return JSON.stringify(formattedFallback);
      }

      const formattedProducts = products.map((p) => ({
        ...p,
        price: formatCurrency(p.price),
        product_path: `${CLIENT_URL}/product/${p.id}`,
        relevance: Math.round((p.score as number) * 100) + "%",
      }));

      return JSON.stringify(formattedProducts);
    } catch (error) {
      console.error("Tool Error (Vector Search):", error);
      return "An error occurred while performing product search.";
    }
  },
  {
    name: "search-products",
    description: `
    USE CASE: The PRIMARY search tool. Use whenever user provides specific criteria (keywords, category, color, or price).
    
    PARAMETER EXTRACTION RULES:
    1. 'query': The search keywords (e.g., "birthday gift", "red roses"). REMOVE price mentions from this string.
    2. 'minPrice' / 'maxPrice': Extract numeric budget limits here.
    
    EXAMPLE:
    User: "Show me watches under 5000"
    Tool Input: { "query": "watches", "maxPrice": 5000 }
    `,
    schema: z.object({
      query: z
        .string()
        .describe(
          "The user's search intent. Can be abstract (e.g. 'anniversary') or specific."
        ),
      minPrice: z.number().optional().describe("Minimum price filter (LKR)"),
      maxPrice: z.number().optional().describe("Maximum price filter (LKR)"),
    }),
  }
);

export const getAllCategories = tool(
  async () => {
    try {
      const categories = await db
        .select({
          id: categoriesTable.categoryId,
          name: categoriesTable.name,
          description: categoriesTable.description,
          productCount: count(productsTable.productId),
        })
        .from(categoriesTable)
        .leftJoin(
          productsTable,
          eq(categoriesTable.categoryId, productsTable.categoryId)
        )
        .groupBy(
          categoriesTable.categoryId,
          categoriesTable.name,
          categoriesTable.description
        )
        .orderBy(categoriesTable.name);

      const formattedCategories = categories.map((c) => ({
        name: c.name,
        description: c.description,
        total_items: Number(c.productCount),
      }));

      return JSON.stringify(formattedCategories);
    } catch (error) {
      console.error("Tool Error (getAllCategories):", error);
      return "Error fetching category list.";
    }
  },
  {
    name: "get-all-categories",
    description: `
    USE CASE: Fetch a list of all product departments/collections.
    TRIGGER: User asks "What do you sell?", "Show me your collections", or "Do you have electronics?".
    `,
    schema: z.object({}),
  }
);

export const readOrders = tool(
  async (params, runOpts: RunnableConfig) => {
    const userId = runOpts.configurable?.user_id;
    const { orderId } = params;

    if (!userId) {
      return "Error: User not authenticated. Cannot access orders.";
    }

    if (!orderId) {
      return "Error: Order ID cannot be empty.";
    }

    try {
      const order = await db
        .select({
          orderId: ordersTable.orderId,
          address: ordersTable.address,
          totalAmount: ordersTable.totalAmount,
          paymentMethod: ordersTable.paymentMethod,
          status: ordersTable.status,
          createdAt: ordersTable.createdAt,
        })
        .from(ordersTable)
        .leftJoin(
          orderItemsTable,
          eq(ordersTable.orderId, orderItemsTable.orderId)
        )
        .where(
          and(
            eq(ordersTable.userId, Number(userId)),
            eq(ordersTable.orderId, Number(orderId))
          )
        )
        .groupBy(ordersTable.orderId);
      if (order.length === 0) {
        return `Order with ID ${orderId} not found for this user.`;
      }

      return JSON.stringify(order[0]);
    } catch (error) {
      console.error("Tool Error (readOrders):", error);
      return "An error occurred while accessing the order database.";
    }
  },
  {
    name: "readOrders",
    description: `
    USE CASE: Check the status of a specific order.
    
    MANDATORY REQUIREMENT:
    - You MUST provide a specific 'orderId'.
    - If the user asks "Show my orders" WITHOUT providing an ID, DO NOT call this tool. Instead, reply asking for the Order ID.
    `,
    schema: z.object({
      orderId: z.string().describe("The unique identifier of the order"),
    }),
  }
);

export const lookupPolicy = tool(
  async ({ query }: { query: string }) => {
    try {
      // 1. Convert user question to vector
      const queryVector = await embeddings.embedQuery(query);

      // 2. Perform Vector Search (Semantic Similarity)
      const similarity = sql<number>`1 - (${cosineDistance(
        documentsTable.embedding,
        queryVector
      )})`;

      const docs = await db
        .select({
          content: documentsTable.content,
          similarity: similarity,
        })
        .from(documentsTable)
        .where(gt(similarity, 0.75)) // Only relevant matches
        .orderBy(desc(similarity))
        .limit(3);

      if (docs.length === 0) return "No specific policy found for this query.";

      // 3. Return the text chunks to the LLM
      return docs.map((d) => d.content).join("\n\n");
    } catch (error) {
      return "Error accessing policy handbook.";
    }
  },
  {
    name: "consult_policy_handbook",
    description: `
    USE CASE: Retrieve official business policies (Shipping, Returns, Privacy, Payments).
    TRIGGER: User asks "How do I return?", "Is it safe?", "Delivery time?".
    
    RESTRICTIONS:
    - Treat this tool as the single source of truth for rules.
    - If this tool returns "No policy found", admit you don't know. Do not hallucinate policies.
    `,
    schema: z.object({
      query: z
        .string()
        .describe(
          "The specific policy question, e.g., 'How do I return an item?'"
        ),
    }),
  }
);
